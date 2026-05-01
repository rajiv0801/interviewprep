import crypto from 'crypto';

interface JitsiRoomConfig {
    bookingId: string;
    mentorName: string;
    studentName: string;
    duration: number; // minutes
}

interface JitsiRoomResult {
    roomName: string;
    meetingLink: string;
    jwt?: string;
}

class JitsiService {
    private readonly baseUrl: string;
    private readonly appId: string;
    private readonly appSecret: string;

    constructor() {
        this.baseUrl = process.env.JITSI_BASE_URL || 'https://meet.jit.si';
        this.appId = process.env.JITSI_APP_ID || '';
        this.appSecret = process.env.JITSI_APP_SECRET || '';
    }

    /**
     * Generates a unique, deterministic room name for a booking.
     * Uses a hash of the bookingId to keep it short and URL-safe.
     */
    generateRoomName(bookingId: string): string {
        const hash = crypto
            .createHash('sha256')
            .update(`graphora-${bookingId}`)
            .digest('hex')
            .slice(0, 12);
        return `graphora-${hash}`;
    }

    /**
     * Creates a Jitsi room configuration for a booking.
     * Returns the room name and meeting link.
     */
    createRoom(config: JitsiRoomConfig): JitsiRoomResult {
        const roomName = this.generateRoomName(config.bookingId);
        const meetingLink = `${this.baseUrl}/${roomName}`;

        const result: JitsiRoomResult = { roomName, meetingLink };

        // If Jitsi app credentials are configured, generate a JWT token
        if (this.appId && this.appSecret) {
            result.jwt = this.generateJWT(roomName, config);
        }

        return result;
    }

    /**
     * Generates a Jitsi JWT token for authenticated room access.
     * Only used when self-hosted Jitsi with JWT auth is configured.
     */
    private generateJWT(roomName: string, config: JitsiRoomConfig): string {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.appId,
            sub: new URL(this.baseUrl).hostname,
            aud: 'jitsi',
            room: roomName,
            exp: now + config.duration * 60 + 300, // session duration + 5 min buffer
            iat: now,
            context: {
                user: {
                    name: config.mentorName,
                    affiliation: 'owner'
                },
                features: {
                    livestreaming: false,
                    recording: false,
                    'screen-sharing': true,
                    'outbound-call': false
                }
            }
        };

        const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', this.appSecret)
            .update(`${header}.${payloadStr}`)
            .digest('base64url');

        return `${header}.${payloadStr}.${signature}`;
    }

    /**
     * Generates the full meeting URL with optional JWT.
     */
    getMeetingUrl(roomName: string, jwt?: string): string {
        const base = `${this.baseUrl}/${roomName}`;
        if (jwt) return `${base}?jwt=${jwt}`;
        return base;
    }

    /**
     * Checks if Jitsi is configured with custom credentials (self-hosted).
     */
    isCustomConfigured(): boolean {
        return !!(this.appId && this.appSecret);
    }
}

const jitsiService = new JitsiService();
export default jitsiService;
export { JitsiService, JitsiRoomConfig, JitsiRoomResult };
