import jsqr from "jsqr"
import { parseHostMessage, IHCSimple } from "../../src/helpers/webrtc/hostproto"

export function _showQr(elemSelector: string, qrName: string)
{
	return cy.wait(800).then(() =>
	{
		return cy.document().then(doc =>
		{
			return cy.fixture(`qr/${qrName}.mp4`, 'base64').then(mov =>
			{
				let uri = `data:video/mp4;base64,${mov}`
				let el = doc.querySelector(elemSelector)
	
				if (!el)
					throw `video element "${elemSelector}" not found`
		
				el.setAttribute('src', uri)
				return cy.get('video').should('have.attr', 'src', uri).then(() => cy.wait(800))
			})
		})
	})
}
export function showQrText(text: string)
{
	console.log(`showQrText("${text}")`)
	return cy.document().then(document =>
	{
		return cy.get('[data-cy=video-video]').should('exist').then(el =>
		{
			el.attr('data-fake-qr', text)
		})
	})
}
export function loadQrFromBase64(src: string)
{
	return cy.document().then(document =>
	{
		return new Promise<string>((res, rej) =>
		{
			let canvas = document.createElement('canvas')
			let ctx = canvas.getContext('2d')!
			let loader = new Image()
			loader.width = canvas.width = 200
			loader.height = canvas.height = 200
			loader.onload = () =>
			{
				ctx.drawImage(loader, 0, 0, loader.width, loader.height)
				let data = ctx.getImageData(0, 0, canvas.width, canvas.height)
				let qr = jsqr(data.data, data.width, data.height)
				assert(qr, `getQrData(): qr should be defined`)
				console.log(`loadQrFromBase64(): ${qr!.data}`)
				res(qr!.data)
			}
			// cy.wait(50)
			loader.src = src
			// cy.wait(50)
		})
	})
}
export function getQrDataPng(elem: JQuery<HTMLElement>)
{
	return cy.wrap(elem).then((elem) =>
	{
		return loadQrFromBase64((elem.toArray()[0] as unknown as HTMLImageElement).src)
	})
}
export function checkShownQr(text: string | RegExp)
{
	// console.log('&&& 1')
	
	return cy.get('[data-cy=qr-image]').should('exist').then((elem) =>
	{
		// console.log('&&& 3')
		return getQrDataPng(elem).then(qr =>
		{
			console.log(`qr: ${qr}`)
			// console.log('&&& 4')
			if (typeof text === "string")
				/* console.log('&&& 5'),  */expect(qr).eq(text)
			else
				/* console.log('&&& 6'),  */expect(qr).match(text)
			// console.log('&&& 7')
			
			return qr
		})
	})
}
export function checkWebrtcQr()
{
	return cy.get('video').should('not.exist').then(() =>
	{
		return checkShownQr(/^webrtcLogin\|\d\|.*$/).then(qr =>
		{
			cy.get('video').should('not.exist')
			let msg = parseHostMessage(qr) as IHCSimple<{sid: string}, { url: string }>
			assert(msg, `checkWebrtcQr(): qr message should be defined`)
			expect(msg.method).eq('webrtcLogin')
			expect(msg.id).match(/\d+/)
			assert(msg.params, `checkWebrtcQr(): qr msg params are not defined!`)
			let [sid, url] = Array.isArray(msg.params) ? msg.params : [msg.params.sid, msg.params.url]
			expect(sid).match(/^session0\.\d+$/)
			expect(url).eq('wss://duxi.io/shake')
			return cy.wrap({ sid, url })
		})
	})
}