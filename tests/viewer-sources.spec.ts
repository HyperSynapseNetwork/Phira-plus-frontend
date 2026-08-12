import { describe, expect, it } from 'vitest'
import { liveWsUrl, replayWsUrl } from '~/viewer/sources'

describe('viewer WS URL sources (contract P-81/P-82)', () => {
  it('live WS uses ROOM ID, not the shareable room_uuid', () => {
    expect(liveWsUrl('https://api-phira.htadiy.com', 'room-123'))
      .toBe('wss://api-phira.htadiy.com/ws/v1/rooms/room-123/live')
  })

  it('replay WS uses ROUND UUID', () => {
    expect(replayWsUrl('https://api-phira.htadiy.com', 'round-abc'))
      .toBe('wss://api-phira.htadiy.com/ws/v1/replays/round-abc')
  })

  it('normalizes http and trailing slashes', () => {
    expect(liveWsUrl('http://localhost:3000/', 'r'))
      .toBe('ws://localhost:3000/ws/v1/rooms/r/live')
  })

  it('url-encodes identifiers', () => {
    expect(liveWsUrl('https://api-phira.htadiy.com', 'a b'))
      .toBe('wss://api-phira.htadiy.com/ws/v1/rooms/a%20b/live')
  })
})
