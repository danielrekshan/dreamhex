import modal
import io
import os
import json # Added json import

# --- APP DEFINITION ---
app = modal.App("dreamhex-worker")

# --- CONFIG ---
MODEL_ID = "stabilityai/sdxl-turbo"

def download_models():
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
    .run_function(download_models)
)

with image.imports():
    import torch
    import torch.nn as nn
    from diffusers import AutoPipelineForImage2Image
    from rembg import remove, new_session
    from PIL import Image
    from google.cloud import storage
    from google.oauth2 import service_account # Added explicit auth import

# --- WORKER CLASS ---
# FIX 1: Upgrade to A100 to ensure we have enough VRAM for the Proof of Concept
@app.cls(gpu="A100", image=image, secrets=[modal.Secret.from_name("gcp-credentials")])
class DreamPainter:
    def __init__(self):
        self.pipe = None 
        self.rembg = None
        self.storage_client = None
        self.bucket_name = None

    @modal.enter()
    def load_models(self):
        print("🎨 RUNTIME: Loading Models from disk...")
        try:
            self.pipe = AutoPipelineForImage2Image.from_pretrained(
                MODEL_ID, 
                torch_dtype=torch.float16, 
                variant="fp16",
                local_files_only=True 
            )
            
            self.pipe.enable_model_cpu_offload()
            print("✅ SDXL-Turbo Loaded.")
            
            self.rembg = new_session("u2net")
            print("✅ RemBG Loaded.")

            # FIX 2: Handle JSON content in Env Var directly
            # This detects if 'GOOGLE_APPLICATION_CREDENTIALS' is the JSON string itself
            creds_val = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            project_id = None
            
            if creds_val and creds_val.strip().startswith("{"):
                print("🔑 Found JSON content in env var. Parsing directly...")
                service_account_info = json.loads(creds_val)
                creds = service_account.Credentials.from_service_account_info(service_account_info)
                project_id = service_account_info.get("project_id")
                self.storage_client = storage.Client(credentials=creds, project=project_id)
            else:
                print("Cm Looking for file-path credentials or default auth...")
                self.storage_client = storage.Client()

            self.bucket_name = os.environ.get("GCS_BUCKET_NAME", f"dreamhex-assets-{project_id}" if project_id else "dreamhex-assets-dreamhex") 
            print(f"✅ Storage Client Connected. Bucket: {self.bucket_name}")
            
        except Exception as e:
            print(f"❌ CRITICAL LOAD ERROR in load_models: {e}")
            # Do not raise, allow debugging via logs if partial load succeeds

    def _upload(self, image, path):
        if not self.storage_client:
            print("⚠️ Upload failed: Storage client not initialized.")
            return "error_url"
            
        try:
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(path)
            b = io.BytesIO()
            fmt = "JPEG" if path.endswith('.jpg') else "PNG"
            image.save(b, format=fmt)
            b.seek(0)
            content_type = "image/jpeg" if fmt == "JPEG" else "image/png"
            blob.upload_from_file(b, content_type=content_type)
            return f"https://storage.googleapis.com/{self.bucket_name}/{path}"
        except Exception as e:
            print(f"❌ UPLOAD ERROR: {e}")
            return "error_url_upload_exception"

    def _make_seamless(self, type):
        if not self.pipe: return

        def patch(m):
            if isinstance(m, nn.Conv2d):
                m.padding_mode = 'circular' if type == "pano" else 'zeros'
            return m
        
        self.pipe.unet.apply(patch)
        self.pipe.vae.apply(patch)

    @modal.method()
    def generate_sequence(self, prompt_a, prompt_b, type, frames, path_prefix):
        if not getattr(self, 'pipe', None):
            print("❌ Generation failed: SDXL model is not loaded.")
            return []
            
        print(f"🖌️ Generating {type}: {path_prefix}")
        
        try:
            self._make_seamless(type)
            width, height = (1024, 512) if type == "pano" else (512, 512)
            style = "Ink and watercolor, thick india ink lines, vintage paper texture, hazy. "
            
            urls = []
            curr = Image.new("RGB", (width, height), (255, 255, 255))
            
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
                        
                    file_ext = 'jpg' if type=='pano' else 'png'
                    url = self._upload(out, f"{path_prefix}_{i}.{file_ext}")
                    urls.append(url)
                    curr = out
                    
            return urls
        except Exception as e:
            print(f"❌ ERROR in generate_sequence: {e}")
            return []