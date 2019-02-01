import { JsonRpc, RequestHandler } from "../../src/helpers/webrtc/jsonrpc"
import { getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"

import { checkWebrtcQr } from "./interact_qr"
import { parseHostMessage, IHCSimple } from "../../src/helpers/webrtc/hostproto"
import * as config from "./config"

export function connectWebsocket(onIncoming: RequestHandler, onOpen: (offer: string, jrpc: JsonRpc) => void)
{
	return checkWebrtcQr().then(({ sid, url }) =>
	{
		let ws = new WebSocket(url)
		
		let jrpc = new JsonRpc(msg => (/* console.log('OUT>',msg), */ws.send(msg)), (json, cb) =>
		{
			// console.log('<IN', json)
			assert(json, `connectWebsocket(): jrpc msg should be defined`)
			onIncoming(json, cb)
		})
		ws.addEventListener('message', ev => jrpc.onMessage(ev.data.toString()))

		ws.addEventListener('open', async () =>
		{
			let result = await jrpc.callRaw("join", { sid }) as { offer: string }
			let offer = result.offer
			assert.isString(offer)
			
			await onOpen(offer, jrpc)
		})
		return [ws, jrpc] as [WebSocket, JsonRpc]
	})
}
export function connectWebrtc()
{
	let webrtc = getWebrtc()
	let closeWs: () => void

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
				expect(json.params).eql([config.blockchains])
			else
				expect(json.params).eql({blockchains: config.blockchains})
			
			// console.log("^^^ 8")
			closeWs()
			res(cb)
		})
	})
	return connectWebsocket((json, cb) =>
	{
		assert(json, `connectWebrtc(): jrpc msg should be defined`)
		expect(json.method).eq('ice')
		let [cand] = Array.isArray(json.params) ? json.params : [json.params.ice]
		webrtc.rtc.signal({ candidate: cand })
	}, (offer, jrpc) =>
	{
		webrtc.rtc.signal({ type: "offer", sdp: offer } as any)
		webrtc.rtc.on('ice', cand => jrpc.callRaw('ice', { ice: cand }))
	}).then(([ws, jrpc]) =>
	{
		closeWs = () => ws.close()

		webrtc.rtc.on('signal', signal =>
		{
			// console.log(`SIGNAL$`, signal)
			if (signal.type == 'answer')
				jrpc.callRaw("answer", { answer: signal.sdp })
			if (signal.candidate)
				jrpc.callRaw("ice", { ice: signal.candidate })
		})

		return p
	})
}

export function connectFallback()
{
	return cy.document().then(document =>
	{
		return cy.get('[data-cy=webrtc-force]').should('exist').then(el =>
		{
			el.attr('data-force-fallback', 1)
		}).then(() =>
		{
			let finish: () => void
			let p = new Promise((res, rej) =>
			{
				finish = res
			})
			return connectWebsocket((json, cb) =>
			{
				expect(json.method).oneOf(['fallback', 'ice'])
			}, (offer, jrpc) =>
			{
				console.log(`CYPRESS GOT OFFER: ${offer}`)
				jrpc.switchToQueueMode()
				getWebrtc().rtc.on('signal', signal =>
				{
					// console.log(`SIGNAL$`, signal)
					if (signal.type == 'answer')
						jrpc.callRaw("answer", { answer: signal.sdp })
				})
				getWebrtc().rtc.signal({ type: "offer", sdp: offer } as any)
				return jrpc.nextMessage().then(async ([json, cb]) =>
				{
					// console.log('$$$$$$ 7')
					while (json.method == 'ice')
					{
						// console.log('$$$$$$ -8')
						;[json, cb] = await jrpc.nextMessage()
						// console.log('$$$$$$ -9')
					}
					// console.log('$$$$$$ 10')
					
					expect(json.method).eq('fallback')
					// console.log('$$$$$$ 11')
					let [msg] = Array.isArray(json.params) ? json.params : [(json.params as any).msg]
					// console.log('$$$$$$ 12')
					let innerJson = parseHostMessage(msg) as IHCSimple<{ blockchains: string[] }>
					// console.log('$$$$$$ 13')
					assert(innerJson, `incoming fallback message should have inner message`)
					// console.log('$$$$$$ 14')
					expect(innerJson!.method).eq('getWalletList')
					// console.log('$$$$$$ 15')
					if (Array.isArray(innerJson.params))
						expect(innerJson.params).eql([config.blockchains])
					else
						expect(innerJson.params).eql({blockchains: config.blockchains})

					jrpc.callRaw('fallback', {
						msg: JSON.stringify({
							id: innerJson.id,
							result: [
								{address: '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0', chainId:4, blockchain:'eth'}
							]
						})
					})
					
					cy.contains(/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)

					finish()
				})
			}).then(([ws, jrpc]) =>
			{
				return p
			})
		})
	})
}