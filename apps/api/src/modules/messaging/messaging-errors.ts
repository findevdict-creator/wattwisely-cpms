import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../../common/problem/problem.exception';

/** The problems the messaging endpoints answer with (module 17). */
export class MessagingErrors {
  static channelMissing(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'messaging_channel_missing',
      'Set up the WhatsApp number first.',
    );
  }

  static conversationNotFound(): ProblemException {
    return new ProblemException(
      HttpStatus.NOT_FOUND,
      'conversation_not_found',
      'This conversation does not exist.',
    );
  }

  static numberTaken(): ProblemException {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'messaging_number_taken',
      'This WhatsApp number is already set up for another company.',
    );
  }

  static verifyRefused(): ProblemException {
    return new ProblemException(
      HttpStatus.FORBIDDEN,
      'webhook_verify_refused',
      'The verify token does not match WHATSAPP_VERIFY_TOKEN.',
    );
  }

  static signatureInvalid(): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'webhook_signature_invalid',
      'The X-Hub-Signature-256 header does not match the body.',
    );
  }
}
