import modal
import io
import os

# --- APP DEFINITION ---
app = modal.App("dreamhex-worker")

# --- IMAGE ENV ---
image = (
    modal.Image.debian_slim()
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "diffusers", "transformers", "accelerate", "safetensors", "rembg", "pillow", "google-cloud-storage", "onnxruntime-gpu"
    )
    # FIX 1: Install CUDA-enabled PyTorch correctly using extra_index_url
    .pip_install(
        "torch",
        extra_index_url="https://download.pytorch.org/whl/cu121"
    )
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
    def __enter__(self):
        print("🎨 Loading Models...")
        self.pipe = None 
        self.rembg = None 
        
        try:
            # 1. Load SDXL (Requires CUDA)
            self.pipe = AutoPipelineForImage2Image.from_pretrained(
                "stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16"
            ).to("cuda")
            print("✅ SDXL-Turbo Loaded.")
            
            # 2. Load RemBG
            self.rembg = new_session("u2net")
            print("✅ RemBG Loaded.")

        except Exception as e:
            # If initialization fails, self.pipe/self.rembg remain None, logging the failure
            print(f"❌ CRITICAL LOAD ERROR in __enter__: {e}")
        
        self.storage_client = storage.Client()
        self.bucket_name = os.environ.get("GCS_BUCKET_NAME", "dreamhex-assets-dreamhex") 

    def _upload(self, image, path):
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
        """Applies circular padding for panoramic generation, with safety check."""
        if not self.pipe:
            print("⚠️ Cannot make seamless: Pipe not initialized.")
            return

        def patch(m):
            if isinstance(m, nn.Conv2d):
                m.padding_mode = 'circular' if type == "pano" else 'zeros'
            return m
        self.pipe.unet.apply(patch)
        self.pipe.vae.apply(patch)

    @modal.method()
    def generate_sequence(self, prompt_a, prompt_b, type, frames, path_prefix):
        if not self.pipe:
            # Fail gracefully if loading failed in __enter__
            print("❌ Generation failed: SDXL model is not loaded.")
            return []
            
        print(f"🖌️ Generating {type}: {path_prefix}")
        self._make_seamless(type)
        width, height = (1024, 512) if type == "pano" else (512, 512)
        style = "Ink and watercolor, thick india ink lines, vintage paper texture, hazy. "
        
        urls = []
        curr = Image.new("RGB", (width, height), (255, 255, 255))
        
        for i in range(frames):
            strength = 0.5 if i > 0 else 1.0
            out = self.pipe(
                prompt=style + prompt_a, image=curr, strength=strength, 
                num_inference_steps=2, guidance_scale=0.0
            ).images[0]
            
            if type == "sprite":
                # FIX 2: Explicitly check and handle rembg session for safety
                if self.rembg:
                    out = remove(out, session=self.rembg)
                else:
                    # If rembg failed to load, proceed without background removal
                    print("⚠️ RemBG session unavailable. Skipping background removal.")
                
            file_ext = 'jpg' if type=='pano' else 'png'
            url = self._upload(out, f"{path_prefix}_{i}.{file_ext}")
            urls.append(url)
            curr = out
            
        return urls