import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi, MockInstance } from 'vitest';
import { AiProviderService } from './ai-provider.service';
import { AiProviderException } from '../exceptions/ai-provider.exception';

describe('AiProviderService', () => {
  let service: AiProviderService;
  let configService: ConfigService;
  let configGetMock: MockInstance;

  beforeEach(() => {
    configGetMock = vi.fn().mockImplementation((key: string) => {
      if (key === 'AI_ENABLED') return true;
      if (key === 'GOOGLE_API_KEY') return 'google-key';
      if (key === 'GROQ_API_KEY') return 'groq-key';
      if (key === 'AI_DEFAULT_PROVIDER') return 'google';
      return undefined;
    });

    configService = {
      get: configGetMock,
    } as unknown as ConfigService;

    service = new AiProviderService(configService);
  });

  describe('isEnabled', () => {
    it('returns true when enabled in config', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when disabled in config', () => {
      configGetMock.mockReturnValue(false);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('getModel', () => {
    it('throws if AI is disabled', () => {
      configGetMock.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return false;
        return undefined;
      });
      expect(() => service.getModel()).toThrow(AiProviderException);
    });

    it('throws if API key is missing', () => {
      configGetMock.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return true;
        return undefined;
      });
      expect(() => service.getModel('google')).toThrow(AiProviderException);
    });

    it('returns a ChatGoogle instance for google provider', () => {
      const model = service.getModel('google');
      expect(model.constructor.name).toContain('ChatGoogle');
    });

    it('returns a ChatGroq instance for groq provider', () => {
      const model = service.getModel('groq');
      expect(model.constructor.name).toContain('ChatGroq');
    });
  });

  describe('invokeWithFailover', () => {
    it('succeeds on first provider', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await service.invokeWithFailover(fn, 'google');
      expect(result).toEqual({ result: 'ok', provider: 'google' });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('fails over to second provider if first fails', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('google failed'))
        .mockResolvedValueOnce('ok from groq');

      const result = await service.invokeWithFailover(fn, 'google', [
        'google',
        'groq',
      ]);
      expect(result).toEqual({ result: 'ok from groq', provider: 'groq' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws if all providers fail', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permanent failure'));
      await expect(service.invokeWithFailover(fn)).rejects.toThrow(
        AiProviderException,
      );
    });
  });
});
