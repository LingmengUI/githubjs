import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export async function GET() {
  try {
    const connection = await pool.getConnection()
    const [messages] = await connection.execute(`
      SELECT 
        m.id,
        m.content,
        m.created_at,
        IF(m.is_admin = 1, true, false) as is_admin,
        IF(m.is_pinned = 1, true, false) as is_pinned,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', r.id,
            'content', r.content,
            'created_at', r.created_at,
            'is_admin', IF(r.is_admin = 1, true, false)
          )
        )
        FROM messages r 
        WHERE r.reply_to = m.id
        ) as replies
      FROM messages m
      WHERE m.reply_to IS NULL
      ORDER BY m.is_pinned DESC, m.created_at DESC
      LIMIT 50
    `)
    connection.release()
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { message, isAdmin, replyTo } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const connection = await pool.getConnection()
    const [result] = await connection.execute(
      'INSERT INTO messages (content, is_admin, reply_to) VALUES (?, ?, ?)',
      [message.trim(), isAdmin ? 1 : 0, replyTo || null]
    )
    connection.release()

    return NextResponse.json({ 
      success: true,
      message: {
        content: message.trim(),
        isAdmin,
        replyTo,
        created_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('POST Error:', error)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { messageId, isPinned } = await request.json()
    
    const connection = await pool.getConnection()
    await connection.execute(
      'UPDATE messages SET is_pinned = ? WHERE id = ?',
      [isPinned, messageId]
    )
    connection.release()

    return NextResponse.json({ 
      success: true,
      message: isPinned ? '留言已置顶' : '已取消置顶'
    })
  } catch (error) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { messageId } = await request.json()
    
    const connection = await pool.getConnection()
    
    // 先删除所有回复
    await connection.execute(
      'DELETE FROM messages WHERE reply_to = ?',
      [messageId]
    )
    
    // 再删除主留言
    await connection.execute(
      'DELETE FROM messages WHERE id = ?',
      [messageId]
    )
    
    connection.release()

    return NextResponse.json({ 
      success: true,
      message: '留言已删除'
    })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
} 