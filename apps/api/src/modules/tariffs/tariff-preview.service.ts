import { HttpStatus, Injectable } from '@nestjs/common';
import { PricingEngine } from '@wattwisely/pricing';
import { ProblemException } from '../../common/problem/problem.exception';
import { TariffPreviewRequestDto } from './dto/tariff-preview-request.dto';
import { TariffPreviewDto } from './dto/tariff-preview.dto';
import { PreviewUsage } from './preview-usage';
import { TariffErrors } from './tariff-errors';
import { TariffPriceRules } from './tariff-price-rules';
import { TariffPrices } from './tariff-prices';

/**
 * Prices a made-up session with prices that are not saved yet, with the same engine that
 * prices real sessions, so the editor can show "a one-hour peak charge costs 8.80".
 */
@Injectable()
export class TariffPreviewService {
  static readonly MAX_SPAN_MS = 7 * 24 * 60 * 60 * 1000;

  private readonly engine = new PricingEngine();

  preview(request: TariffPreviewRequestDto): TariffPreviewDto {
    const problems = TariffPriceRules.problemsOf(request.prices);
    if (problems.length > 0) {
      throw TariffErrors.invalidPrices(problems);
    }
    const startedAt = new Date(request.started_at);
    const endedAt = new Date(request.ended_at);
    const span = endedAt.getTime() - startedAt.getTime();
    if (span <= 0 || span > TariffPreviewService.MAX_SPAN_MS) {
      throw new ProblemException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'preview_invalid',
        'The charge must stop after it starts, and last at most 7 days.',
      );
    }
    const tariff = TariffPrices.toPricing(request.prices, request.currency, request.time_zone);
    const usage = PreviewUsage.of({
      startedAt,
      endedAt,
      energyWh: request.energy_wh,
      idleMinutes: request.idle_minutes,
    });
    return new TariffPreviewDto(this.engine.price(tariff, usage));
  }
}
