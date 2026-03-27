import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const data = await req.json();
    const filePath = path.join(process.cwd(), 'debug.svg');
    fs.writeFileSync(filePath, data.svg);
    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
