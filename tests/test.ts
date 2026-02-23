import { PROVIDERS } from './web/src/lib/providers';

const PROVIDER_MODELS: Record<string, string[]> = Object.fromEntries(
    Object.entries(PROVIDERS).map(([k, v]) => [k, v.models.map(m => m.id)])
);

function inferProviderByModel(modelId: string): string | "" {
    if (!modelId) return "";
    for (const [prov, models] of Object.entries(PROVIDER_MODELS)) {
        if (models.includes(modelId)) return prov;
    }
    return "";
}

console.log("gpt-4o falls under:", inferProviderByModel("gpt-4o"));
console.log("deepseek-chat falls under:", inferProviderByModel("deepseek-chat"));
