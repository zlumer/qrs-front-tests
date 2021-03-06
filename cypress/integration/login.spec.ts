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
		cy.get('[data-cy=login-qr]').should('exist')
		cy.get('[data-cy=login-webrtc]').should('exist')
		cy.get('[data-cy=video-ready]').should('not.exist')
	})
	it('should render login page correctly', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-qr]').click()
		cy.url().should('include', '/login')
		cy.get('[data-cy=video-ready]').should('exist')
	})

	it('should login with qr', () =>
	{
		// console.log(`#$# 1`)
		cy.visit('/')
		// console.log(`#$# 2`)
		cy.get('[data-cy=login-qr]').click()
		// console.log(`#$# 3`)
		cy.url().should('include', '/login')
		
		cy.get('[data-cy=video-ready]').should('exist')
		
		checkShownQr(/getWalletList\|\d+\|{"blockchains":\["eth"(\,"eos")?(\,"btc")?(\,"bch")?\]}/)
		// console.log(`#$# 4`)
		showQrText(qrs.login_single_eth_wallet)
		// console.log(`#$# 5`)
		
		// cy.url().should('include', '/wallets')
		// console.log(`#$# 6`)
		// cy.contains(/eth wallet/i)
		// console.log(`#$# 7`)
		// cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		cy.url().should('match', /\/wallet\/eth\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		// console.log(`#$# 8`)
		// console.log(`#$# 9`)
	})

	it('should login directly on /login', () =>
	{
		cy.visit('/login')
		
		cy.get('[data-cy=video-ready]').should('exist')

		checkShownQr(/^getWalletList\|\d+\|{"blockchains":\["eth"(\,"eos")?(\,"btc")?(\,"bch")?\]}$/)
		showQrText(qrs.login_single_eth_wallet)
		
		// cy.url().should('include', '/wallets')
		cy.url().should('match', /\/wallet\/eth\/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/i)
		cy.contains(/eth wallet/i)
		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
	})

	it('should open webrtc login page', () =>
	{
		cy.visit('/')
		// cy.contains('WebRTC login').click()
		cy.get('[data-cy=login-webrtc]').click()

		cy.url().should('match', /[\/webrtc|\/login\?rtc=true]/)

		checkWebrtcQr()
	})
	it('should navigate directly to webrtc login page', () =>
	{
		cy.visit('/webrtc')

		checkWebrtcQr()
	})

	it('should connect webrtc', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()
		
		connectWebrtc()
	})
	it('should connect webrtc 2nd time', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()
		
		connectWebrtc()
	})
	it('REGRESSION: should show qr after webrtc login', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()
		checkWebrtcQr().then(() =>
		{
			cy.go('back')
			cy.get('[data-cy=login-qr]').click()

			cy.url().should('include', '/login')
			cy.get('[data-cy=video-ready]').should('exist')
			
			checkShownQr(/^getWalletList\|\d+\|{"blockchains":\["eth"(\,"eos")?(\,"btc")?(\,"bch")?\]}$/)
		})
	})
	it('should connect webrtc on 2nd try', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()
		checkWebrtcQr().then(() =>
		{
			cy.go('back')
			cy.get('[data-cy=login-webrtc]').click()

			connectWebrtc()
		})
	})
	
	it('should login with qr multiple wallets', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-qr]').click()
		
		showQrText(qrs.login_multiple_eth_wallets)

		cy.contains('0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		cy.contains('0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
		cy.contains('0x1AD80eC32FD6Ef24e80801e90C5f7e32950C2D05')
	})

	it('should connect with websocket fallback', () =>
	{
		cy.visit('/')
		cy.get('[data-cy=login-webrtc]').click()

		connectFallback()
	})
})