import 'server-only'

export async function GET() {
    throw new Error('failure-test');
}
