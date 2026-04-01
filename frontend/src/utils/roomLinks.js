const ROOM_ID_REGEX = /(?:https?:\/\/[^\s]+)?\/rooms\/([0-9a-fA-F-]{36})/;
const INVITE_REGEX = /(?:https?:\/\/[^\s]+)?\/invite\/([0-9a-fA-F-]{36})/;

export function extractRoomLink(text) {
  if (!text) return null;

  const inviteMatch = text.match(INVITE_REGEX);
  if (inviteMatch) {
    return {
      type: "invite",
      value: inviteMatch[1],
      url: inviteMatch[0],
    };
  }

  const roomMatch = text.match(ROOM_ID_REGEX);
  if (roomMatch) {
    return {
      type: "room",
      value: roomMatch[1],
      url: roomMatch[0],
    };
  }

  return null;
}
