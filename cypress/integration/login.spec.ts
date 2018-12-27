import { reset as resetWebrtc, getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"

import { checkShownQr, showQrText, checkWebrtcQr } from "./interact_qr"
import { connectWebrtc, connectFallback } from "./interact_webrtc"

import qrs = require('../fixtures/qrs.json')

describe('login test', () =>
{
	beforeEach(() =>
	{
		resetWebrtc(false)
		getWebrtc().jrpc.switchToQueueMode()
	})
	afterEach(() =>
	{
		let rpc = getWebrtc().rtc
		if (rpc)
			rpc.destroy()
		
		resetWebrtc(false)
	})
	it('should render main page', () =>
	{
		cy.visit('/')
		cy.contains(/airgapped/i)
		cy.contains(/online/i)
		cy.get('[data-cy=video-ready]').should('not.exist')
	})
	it('should render login page correctly', () =>
	{
		cy.visit('/')
		cy.contains(/airgapped/i).click()
		cy.url().should('include', '/login')
		cy.get('[data-cy=video-ready]').should('exist')
	})

	it('should login with qr', () =>
	{
		// console.log(`#$# 1`)
		cy.visit('/')
		// console.log(`#$# 2`)
		cy.contains(/airgapped/i).click()
		// console.log(`#$# 3`)
		cy.url().should('include', '/login')
		
		cy.get('[data-cy=video-ready]').should('exist')
		
		checkShownQr(/getWalletList\|\d+\|{"blockchains":\["eth"\]}/)
		// console.log(`#$# 4`)
		showQrText(qrs.login_single_eth_wallet)
		// console.log(`#$# 5`)
		
		cy.url().should('include', '/wallets')
		// console.log(`#$# 6`)
		// cy.contains(/eth wallet/i)
		// console.log(`#$# 7`)
		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		// cy.url().should('match', /\/wallet\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		// console.log(`#$# 8`)
		// console.log(`#$# 9`)
	})

	it('should login directly on /login', () =>
	{
		cy.visit('/login')
		
		cy.get('[data-cy=video-ready]').should('exist')

		checkShownQr(/^getWalletList\|\d+\|{"blockchains":\["eth"\]}$/)
		showQrText(qrs.login_single_eth_wallet)
		
		cy.url().should('include', '/wallets')
		// cy.url().should('match', /\/wallet\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		// cy.contains(/eth wallet/i)
		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
	})

	it('should open webrtc login page', () =>
	{
		cy.visit('/')
		// cy.contains('WebRTC login').click()
		cy.contains(/online/i).click()

		cy.url().should('match', /[\/webrtc|\/login\?rtc=true]/)

		checkWebrtcQr()
	})
	it.skip('should navigate directly to webrtc login page', () =>
	{
		cy.visit('/login?webrtc=true')

		checkWebrtcQr()
	})

	it('should connect webrtc', () =>
	{
		cy.visit('/')
		cy.contains(/online/i).click()
		
		connectWebrtc()
	})
	it('should connect webrtc 2nd time', () =>
	{
		cy.visit('/')
		cy.contains(/online/i).click()
		
		connectWebrtc()
	})
	it('REGRESSION: should show qr after webrtc login', () =>
	{
		cy.visit('/')
		cy.contains(/online/i).click()
		checkWebrtcQr().then(() =>
		{
			cy.go('back')
			cy.contains(/airgapped/i).click()

			cy.url().should('include', '/login')
			cy.get('[data-cy=video-ready]').should('exist')
			
			checkShownQr(/^getWalletList\|\d+\|{"blockchains":\["eth"\]}$/)
		})
	})
	it('should connect webrtc on 2nd try', () =>
	{
		cy.visit('/')
		cy.contains(/online/i).click()
		checkWebrtcQr().then(() =>
		{
			cy.go('back')
			cy.contains(/online/i).click()

			connectWebrtc()
		})
	})
	
	it('should login with qr multiple wallets', () =>
	{
		cy.visit('/')
		cy.contains(/airgapped/i).click()
		
		showQrText(qrs.login_multiple_eth_wallets)

		cy.url().should('include', '/wallets')
		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		cy.contains('0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
		cy.contains('0x1AD80eC32FD6Ef24e80801e90C5f7e32950C2D05')
	})

	it('should connect with websocket fallback', () =>
	{
		cy.visit('/')
		cy.contains(/online/i).click()

		connectFallback()
	})
})