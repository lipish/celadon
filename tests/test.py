import json
import re

content = open("web/src/lib/providers.ts").read()

providers = {}
for match in re.finditer(r'([a-z_]+):\s*{[^}]*?label:\s*"([^"]+)"[^}]*?models:\s*\[([^\]]+)\]', content, re.DOTALL):
    prov_id = match.group(1)
    models_str = match.group(3)
    models = []
    for model_match in re.finditer(r'id:\s*"([^"]+)"', models_str):
        models.append(model_match.group(1))
    providers[prov_id] = models

provider_models = {k: v for k, v in providers.items()}

def infer(model_id):
    if not model_id: return ""
    for prov, models in provider_models.items():
        if model_id in models: return prov
    return ""

print("gpt-4o ->", infer("gpt-4o"))
print("deepseek-chat ->", infer("deepseek-chat"))
