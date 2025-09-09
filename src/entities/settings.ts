export enum Settings {
    SessionRecalculationIntervalInSeconds = 'session-recalculation-interval-in-seconds',
    AnthropicApiKey = 'anthropic-api-key',
    AnthropicBaseUrl = 'anthropic-base-url',
    CloudflareAiGatewayToken = 'cloudflare-ai-gateway-token',
}

export enum SettingTypes {
    Text  ,
    Hidden
}

export const DefaultSettingTypes = {
    [Settings.SessionRecalculationIntervalInSeconds]: SettingTypes.Text,
    [Settings.AnthropicApiKey]: SettingTypes.Hidden,
    [Settings.AnthropicBaseUrl]: SettingTypes.Text,
    [Settings.CloudflareAiGatewayToken]: SettingTypes.Hidden,
}
