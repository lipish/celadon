-- Add granular model settings
INSERT INTO system_settings (key, value, description)
VALUES 
    ('LLM_PLANNER_MODEL', 'deepseek/deepseek-chat', 'Model for requirements clarification and planning'),
    ('LLM_EXECUTOR_MODEL', 'deepseek/deepseek-coder', 'Model for code generation and technical execution'),
    ('LLM_REFLECTOR_MODEL', 'deepseek/deepseek-chat', 'Model for code review and design reflection')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- Update existing default model description
UPDATE system_settings 
SET description = 'Default fallback model', 
    value = CASE WHEN value = 'deepseek-chat' THEN 'deepseek/deepseek-chat' ELSE value END
WHERE key = 'CELADON_LLM_MODEL';
