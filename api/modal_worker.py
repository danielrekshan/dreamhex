import modal
import io
import os

# --- 1. CONFIGURATION ---
# FIX: Renamed the instance from stub to app to satisfy the modal deployment client
app = modal.App("dreamhex-worker")
GCS_BUCKET = "dreamhex-assets-dreamhex-prototype" # REPLACE with your actual bucket name

# --- 2. IMAGE DEFINITION ---
# We define the environment (dependencies) for the GPU worker
image = (
    modal.Image.debian_slim()
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "diffusers", "transformers", "accelerate", "safetensors",
        "torch", "rembg", "pillow", "google-cloud-storage", "onnxruntime-gpu"
    )
)

# --- 3. DEPENDENCIES & MODELS ---
# This downloads the models into the container image so cold starts are fast
with image.imports():
    import torch
    import torch.nn as nn
    from diffusers import AutoPipelineForImage2Image
    from rembg import remove, new_session
    from PIL import Image
    from google.cloud import storage

# FIX: Changed @stub.cls to @app.cls
@app.cls(gpu="A10G", image=image, secrets=[modal.Secret.from_name("gcp-credentials")])
class DreamPainter:
    def __enter__(self):
        print("🎨 Loading Models...")
        self.pipe = AutoPipelineForImage2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        ).to("cuda")
        self.rembg = new_session("u2net")
        
        # Initialize GCS Client using the credentials from Modal Secret
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(GCS_BUCKET)

    def _upload_to_gcs(self, image, path):
        blob = self.bucket.blob(path)
        b = io.BytesIO()
        image.save(b, format="PNG")
        b.seek(0)
        blob.upload_from_file(b, content_type="image/png")
        return f"https://storage.googleapis.com/{GCS_BUCKET}/{path}"

    def _make_seamless(self, type):
        def patch(m):
            if isinstance(m, nn.Conv2d):
                m.padding_mode = 'circular' if type == "pano" else 'zeros'
            return m
        self.pipe.unet.apply(patch)
        self.pipe.vae.apply(patch)

    @modal.method()
    def generate_sequence(self, prompt_a, prompt_b, type, frames, path_prefix):
        print(f"🖌️ Generating {type} for: {path_prefix}")
        
        # 1. Config
        self._make_seamless(type)
        width, height = (1024, 512) if type == "pano" else (512, 512)
        style = "Ink and watercolor, thick india ink lines, vintage paper texture, hazy. "
        full_prompt = style + prompt_a + (", 360 equirectangular panorama, sepia" if type=="pano" else ", isolated cutout on white, cel shaded")
        
        # 2. Loop
        generated_urls = []
        current_img = Image.new("RGB", (width, height), (255, 255, 255))
        
        for i in range(frames):
            strength = 0.5 if i > 0 else 1.0
            
            out = self.pipe(
                prompt=full_prompt, 
                image=current_img, 
                strength=strength, 
                num_inference_steps=2, # Turbo is fast!
                guidance_scale=0.0
            ).images[0]
            
            if type == "sprite":
                out = remove(out, session=self.rembg)
            
            # 3. Upload immediately
            file_path = f"{path_prefix}_{i}.{'jpg' if type=='pano' else 'png'}"
            url = self._upload_to_gcs(out, file_path)
            generated_urls.append(url)
            
            current_img = out # Feedback for consistency

        return generated_urls