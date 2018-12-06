import { JsonRpc } from "../../src/helpers/webrtc/jsonrpc"
import { getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"

import { checkWebrtcQr } from "./interact_qr"

export function connectWebrtc()
{
	let webrtc = getWebrtc()
	let ws: WebSocket
	let p = new Promise<(err: any, result: unknown) => void>((res, rej) =>
	{
		webrtc.jrpc.nextMessage().then(([json, cb]) =>
		{
			// console.log("^^^ 3")
			assert(json, `connectWebrtc(): webrtc.jrpc.onRequest json should be defined`)
			// console.log("^^^ 4")
			expect(json.method).eq("getWalletList")
			// console.log("^^^ 5")
			if (Array.isArray(json.params))
				expect(json.params).eql([['eth']])
			else
				expect(json.params).eql({blockchains:['eth']})
			
			// console.log("^^^ 8")
			ws.close()
			res(cb)
		})
	})

	return checkWebrtcQr().then(({ sid, url }) =>
	{
		ws = new WebSocket(url)
		
		let jrpc = new JsonRpc(msg => (/* console.log('OUT>',msg), */ws.send(msg)), (json, cb) =>
		{
			// console.log('<IN', json)
			assert(json, `connectWebrtc(): jrpc msg should be defined`)
			expect(json.method).eq('ice')
			let [cand] = Array.isArray(json.params) ? json.params : [json.params.ice]
			webrtc.rtc.signal({ candidate: cand })
		})
		ws.addEventListener('message', ev => jrpc.onMessage(ev.data.toString()))

		webrtc.rtc.on('signal', signal =>
		{
			// console.log(`SIGNAL$`, signal)
			if (signal.type == 'answer')
				jrpc.callRaw("answer", { answer: signal.sdp })
			if (signal.candidate)
				jrpc.callRaw("ice", { ice: signal.candidate })
		})
		ws.addEventListener('open', async () =>
		{
			let result = await jrpc.callRaw("join", { sid }) as { offer: string }
			let offer = result.offer
			assert.isString(offer)
			webrtc.rtc.signal({ type: "offer", sdp: offer } as any)
			webrtc.rtc.on('ice', cand => jrpc.callRaw('ice', { ice: cand }))
		})
		return p
	})
}