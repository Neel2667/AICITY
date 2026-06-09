/**
 * ChatCommand.ts
 * Defines all supported chat commands, their parser, and rate-limit metadata.
 *
 * Supported commands:
 *   !vote <option>    — vote in the current poll (park | apartments | factory | shops | stadium)
 *   !name <text>      — submit a name for a building/road/district (queued for moderation)
 *   !camera <mode>    — vote for a camera mode (orbit | follow | district | event)
 *   !event fireworks  — request a fireworks event (gated by cooldown + fan funding)
 *   !where            — bot replies with current city status
 *   !mayor            — enter the periodic mayor raffle
 */

export type CommandKind =
  | 'vote'
  | 'name'
  | 'camera'
  | 'event'
  | 'where'
  | 'mayor';

export type VoteOption = 'park' | 'apartments' | 'factory' | 'shops' | 'stadium';
export type CameraMode = 'orbit' | 'follow' | 'district' | 'event';

export interface ChatMessage {
  id: string;
  authorName: string;
  authorChannelId: string;
  text: string;
  publishedAt: string;
  isModerator: boolean;
  isSuperChat: boolean;
  superChatAmount?: number;
}

export interface ParsedCommand {
  kind: CommandKind;
  raw: string;
  authorName: string;
  authorChannelId: string;
  isModerator: boolean;
  isSuperChat: boolean;
  // Specific payloads
  voteOption?: VoteOption;
  nameText?: string;
  cameraMode?: CameraMode;
  eventId?: string;
}

const VALID_VOTE_OPTIONS: VoteOption[] = ['park', 'apartments', 'factory', 'shops', 'stadium'];
const VALID_CAMERA_MODES: CameraMode[] = ['orbit', 'follow', 'district', 'event'];

/**
 * Parse a raw chat message into a ParsedCommand, or return null if not a command.
 */
export function parseCommand(msg: ChatMessage): ParsedCommand | null {
  const text = msg.text.trim();
  if (!text.startsWith('!')) return null;

  const parts = text.slice(1).split(/\s+/);
  const cmd = parts[0]?.toLowerCase() as CommandKind;
  const arg = parts.slice(1).join(' ').trim();

  const base = {
    raw: text,
    authorName: msg.authorName,
    authorChannelId: msg.authorChannelId,
    isModerator: msg.isModerator,
    isSuperChat: msg.isSuperChat,
  };

  switch (cmd) {
    case 'vote': {
      const opt = arg.toLowerCase() as VoteOption;
      if (!VALID_VOTE_OPTIONS.includes(opt)) return null;
      return { kind: 'vote', ...base, voteOption: opt };
    }

    case 'name': {
      if (!arg || arg.length < 2 || arg.length > 48) return null;
      // Strip unsafe characters
      const safe = arg.replace(/[^a-zA-Z0-9 '\-\.]/g, '').trim();
      if (!safe) return null;
      return { kind: 'name', ...base, nameText: safe };
    }

    case 'camera': {
      const mode = arg.toLowerCase() as CameraMode;
      if (!VALID_CAMERA_MODES.includes(mode)) return null;
      return { kind: 'camera', ...base, cameraMode: mode };
    }

    case 'event': {
      const evId = arg.toLowerCase();
      if (evId !== 'fireworks') return null; // only fireworks in Phase 3
      return { kind: 'event', ...base, eventId: evId };
    }

    case 'where':
      return { kind: 'where', ...base };

    case 'mayor':
      return { kind: 'mayor', ...base };

    default:
      return null;
  }
}
