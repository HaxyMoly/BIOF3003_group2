import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../lib/mongodb';
import Session from '../../models/Session';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    
    const session = await Session.create(body);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save session data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    
    const query = subjectId ? { subjectId } : {};
    const sessions = await Session.find(query).sort({ timestamp: -1 }).limit(10);
    
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}