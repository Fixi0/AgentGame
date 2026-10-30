export class GameError extends Error { constructor(code,status=400){super(code);this.code=code;this.status=status;} }
export function requireGame(condition,code,status=400){if(!condition)throw new GameError(code,status);}
