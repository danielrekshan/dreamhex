import modal
import io
import os

# --- APP DEFINITION ---
app = modal.App("dreamhex-worker")

# --- CONFIG ---
# Define model ID here for consistency
MODEL_ID = "stabilityai/sdxl-turbo"

def download_models():
    """
    Downloads models during the build phase.
    This runs ONCE during deployment, not every time the app starts.
    """
    import torch
    from diffusers import AutoPipelineForImage2Image
    from rembg import new_session

    print("💾 BUILD STEP: Downloading SDXL Turbo...")
    AutoPipelineForImage2Image.from_pretrained(
        MODEL_ID, 
        torch_dtype=torch.float16, 
        variant="fp16"
    )
    
    print("💾 BUILD STEP: Downloading RemBG...")
    new_session("u2net")

# --- IMAGE ENV ---
image = (
    modal.Image.debian_slim()
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "diffusers", "transformers", "accelerate", "safetensors", "rembg", "pillow", "google-cloud-storage", "onnxruntime-gpu"
    )
    .pip_install(
        "torch",
        extra_index_url="https://download.pytorch.org/whl/cu121"
    )
    # FIX: Bake models into the image so cold starts are fast
    .run_function(download_models)
)

with image.imports():
    import torch
    import torch.nn as nn
    from diffusers import AutoPipelineForImage2Image
    from rembg import remove, new_session
    from PIL import Image
    from google.cloud import storage

# --- WORKER CLASS ---
@app.cls(gpu="A10G", image=image, secrets=[modal.Secret.from_name("gcp-credentials")])
class DreamPainter:
    def __init__(self):
        """
        Initialize attributes to None to prevent AttributeError.
        This runs instantly on object creation.
        """
        self.pipe = None 
        self.rembg = None
        self.storage_client = None
        self.bucket_name = None

    @modal.enter()
    def load_models(self):
        """
        Load models into memory when the container starts.
        """
        print("🎨 RUNTIME: Loading Models from disk...")
        try:
            # FIX: Load locally (already downloaded) and use CPU offloading to save VRAM
            self.pipe = AutoPipelineForImage2Image.from_pretrained(
                MODEL_ID, 
                torch_dtype=torch.float16, 
                variant="fp16",
                local_files_only=True # Fail if not found (prevents slow download)
            )
            
            # This is the Magic Fix for OOM on A10G with SDXL
            self.pipe.enable_model_cpu_offload()
            print("✅ SDXL-Turbo Loaded with CPU Offload.")
            
            self.rembg = new_session("u2net")
            print("✅ RemBG Loaded.")

            self.storage_client = storage.Client()
            self.bucket_name = os.environ.get("GCS_BUCKET_NAME", "dreamhex-assets-dreamhex") 
            
        except Exception as e:
            print(f"❌ CRITICAL LOAD ERROR in load_models: {e}")
            # We do NOT raise here, so the container stays alive to report the error in logs
            # self.pipe remains None, which is handled in generate_sequence

    def _upload(self, image, path):
        if not self.storage_client:
            print("⚠️ Upload failed: Storage client not initialized.")
            return "error_url"
            
        bucket = self.storage_client.bucket(self.bucket_name)
        blob = bucket.blob(path)
        b = io.BytesIO()
        fmt = "JPEG" if path.endswith('.jpg') else "PNG"
        image.save(b, format=fmt)
        b.seek(0)
        content_type = "image/jpeg" if fmt == "JPEG" else "image/png"
        blob.upload_from_file(b, content_type=content_type)
        return f"https://storage.googleapis.com/{self.bucket_name}/{path}"

    def _make_seamless(self, type):
        if not self.pipe: return

        def patch(m):
            if isinstance(m, nn.Conv2d):
                m.padding_mode = 'circular' if type == "pano" else 'zeros'
            return m
        
        # Apply patch to the correct sub-modules
        self.pipe.unet.apply(patch)
        self.pipe.vae.apply(patch)

    @modal.method()
    def generate_sequence(self, prompt_a, prompt_b, type, frames, path_prefix):
        # FIX: Robust check handling both "None" and "Missing Attribute" (though __init__ fixes missing)
        if not getattr(self, 'pipe', None):
            print("❌ Generation failed: SDXL model is not loaded (self.pipe is None).")
            return []
            
        print(f"🖌️ Generating {type}: {path_prefix}")
        
        try:
            self._make_seamless(type)
            width, height = (1024, 512) if type == "pano" else (512, 512)
            style = "Ink and watercolor, thick india ink lines, vintage paper texture, hazy. "
            
            urls = []
            curr = Image.new("RGB", (width, height), (255, 255, 255))
            
            # Use inference_mode to save memory
            with torch.inference_mode():
                for i in range(frames):
                    strength = 0.5 if i > 0 else 1.0
                    out = self.pipe(
                        prompt=style + prompt_a, 
                        image=curr, 
                        strength=strength, 
                        num_inference_steps=2, 
                        guidance_scale=0.0
                    ).images[0]
                    
                    if type == "sprite":
                        if self.rembg:
                            out = remove(out, session=self.rembg)
                        else:
                            print("⚠️ RemBG session unavailable. Skipping background removal.")
                        
                    file_ext = 'jpg' if type=='pano' else 'png'
                    url = self._upload(out, f"{path_prefix}_{i}.{file_ext}")
                    urls.append(url)
                    curr = out
                    
            return urls
        except Exception as e:
            print(f"❌ ERROR in generate_sequence: {e}")
            return []