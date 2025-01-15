import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

export async function GET() {
  try {
    const connection = await pool.getConnection()
    
    // 首先检查表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages'
    `, [process.env.DB_NAME])

    // 如果表不存在，创建表
    if (Array.isArray(tables) && tables.length === 0) {
      await connection.execute(`
        CREATE TABLE messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_admin BOOLEAN DEFAULT FALSE,
          is_pinned BOOLEAN DEFAULT FALSE,
          reply_to INT,
          FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
    }

    // 检查列是否存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages'
    `, [process.env.DB_NAME])

    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME.toLowerCase())

    // 添加缺失的列
    if (!existingColumns.includes('is_admin')) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `)
    }

    if (!existingColumns.includes('reply_to')) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD COLUMN reply_to INT NULL,
        ADD FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE CASCADE
      `)
    }

    if (!existingColumns.includes('is_pinned')) {
      await connection.execute(`
        ALTER TABLE messages 
        ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE
      `)
    }

    connection.release()
    return NextResponse.json({ success: true, message: 'Database structure updated successfully' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Failed to update database structure', details: error }, { status: 500 })
  }
} 