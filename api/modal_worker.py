import modal
import io
import os
import json

# --- APP DEFINITION ---
app = modal.App("dreamhex-worker")

# --- CONFIG ---
# Switch to A10G (Much cheaper, still fast for SDXL Turbo)
GPU_CONFIG = "A10G" 
MODEL_ID = "stabilityai/sdxl-turbo"

# --- IMAGE DEFINITION ---
def download_models():
    import torch
    from diffusers import AutoPipelineForImage2Image
    from rembg import new_session
    
    print("💾 BUILD: Downloading SDXL Turbo...")
    AutoPipelineForImage2Image.from_pretrained(
        MODEL_ID, torch_dtype=torch.float16, variant="fp16"
    )
    print("💾 BUILD: Downloading RemBG...")
    new_session("u2net")

image = (
    modal.Image.debian_slim()
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "diffusers", "transformers", "accelerate", "safetensors", 
        "rembg", "pillow", "google-cloud-storage", "onnxruntime-gpu", "torch"
    )
    .run_function(download_models)
)

# --- WORKER CLASS ---
@app.cls(gpu=GPU_CONFIG, image=image, secrets=[modal.Secret.from_name("gcp-credentials")], enable_memory_snapshot=True,scaledown_window=120,min_containers=1)
class DreamPainter:
    def __init__(self):
        self.pipe = None 
        self.rembg = None
        self.bucket = None
        self.storage = None
        self.bucket_name = None 

    @modal.enter()
    def setup(self):
        """
        Loads the model into GPU memory when the container boots.
        """
        import torch
        from diffusers import AutoPipelineForImage2Image
        from rembg import new_session
        from google.cloud import storage
        from google.oauth2 import service_account

        print("🎨 WARMUP: Loading Models...")
        self.pipe = AutoPipelineForImage2Image.from_pretrained(
            MODEL_ID, 
            torch_dtype=torch.float16, 
            variant="fp16",
            local_files_only=True 
        )
        self.pipe.to("cuda")
        self.rembg = new_session("u2net")
        
        # GCP Setup
        creds_val = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        project_id = None
        if creds_val and creds_val.strip().startswith("{"):
            info = json.loads(creds_val)
            creds = service_account.Credentials.from_service_account_info(info)
            project_id = info.get("project_id")
            self.storage = storage.Client(credentials=creds, project=project_id)
        else:
            self.storage = storage.Client()
            
        bucket_name_env = os.environ.get("GCS_BUCKET_NAME", f"dreamhex-assets-{project_id}" if project_id else "dreamhex-assets")
        self.bucket = self.storage.bucket(bucket_name_env)
        self.bucket_name = self.bucket.name
        print("✅ READY.")

    @modal.method()
    def wake_up(self):
        """Lightweight method to trigger container boot."""
        print("⏰ Wake up call received!")
        return True

    def _upload(self, image, path):
        if not self.storage or not self.bucket: 
            print("⚠️ Upload failed: Storage client or bucket not initialized.")
            return "error_url"
            
        try:
            # Use the pre-initialized self.bucket object
            blob = self.bucket.blob(path) 
            b = io.BytesIO()
            fmt = "JPEG" if path.endswith('.jpg') else 'PNG' # Changed to ternary operator for consistency
            image.save(b, format=fmt)
            b.seek(0)
            content_type = "image/jpeg" if fmt == "JPEG" else "image/png"
            
            # FIX: Removed predefined_acl='publicRead'
            blob.upload_from_file(
                b, 
                content_type=content_type
            )
            
            # Use the stored bucket name for the final URL
            return f"https://storage.googleapis.com/{self.bucket_name}/{path}"
        except Exception as e:
            print(f"❌ UPLOAD ERROR: {e}")
            return "error_url_upload_exception"
        
    @modal.method()
    def generate_frames(self, prompt_a, prompt_b, type, frames, path_prefix):
        """
        Generates individual frames.
        """
        import torch
        from PIL import Image
        from rembg import remove
        
        print(f"🖌️ Generating {frames} frames for {path_prefix}...")

        # Seamless Patch (Only applying for Pano to ensure 360 loop)
        if type == "pano":
            def patch(m):
                if isinstance(m, torch.nn.Conv2d): m.padding_mode = 'circular'
                return m
            self.pipe.unet.apply(patch)
            self.pipe.vae.apply(patch)
        else:
            # Reset to default if container is reused
            def unpatch(m):
                if isinstance(m, torch.nn.Conv2d): m.padding_mode = 'zeros'
                return m
            self.pipe.unet.apply(unpatch)
            self.pipe.vae.apply(unpatch)

        width, height = (1024, 512) if type == "pano" else (512, 512)
        urls = []
        
        curr_image = Image.new("RGB", (width, height), (128,128,128))
        
        for i in range(frames):
            p = prompt_a if i < frames/2 else (prompt_b or prompt_a)
            
            strength = 0.5 if i > 0 else 1.0
            
            out = self.pipe(
                prompt=f"Ink and watercolor style, {p}",
                image=curr_image,
                strength=strength,
                num_inference_steps=2,
                guidance_scale=0.0
            ).images[0]
            
            curr_image = out 

            if type == "sprite":
                out = remove(out, session=self.rembg)
                ext = "png"
            else:
                ext = "jpg"

            url = self._upload(out, f"{path_prefix}_{i}.{ext}")
            urls.append(url)
            
        return urls