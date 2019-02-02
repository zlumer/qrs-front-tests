import { checkShownQr, showQrText } from "./interact_qr"
import { connectWebrtc } from "./interact_webrtc"
import { reset as resetWebrtc, getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"
import { RequestHandlerTuple } from "../../src/helpers/webrtc/jsonrpc"
import { IHCSimple } from "../../src/helpers/webrtc/hostproto"

import qrs = require('../fixtures/qrs.json')

describe('payment links', () =>
{
	const regexNumber = /^\d+(\.\d+)?$/
	const form = (name: string) => cy.get(`[data-cy=form-${name}]`)
	describe('should open payment form in ETH', () =>
	{
		it('with amount', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-amount=1.2345')
			form('amount').should('have.value', '1.2345')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
		})
		it('with usd', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-usd=1.2345')
			form('usd').should('have.value', '1.2345')
			form('amount').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
		})
		it('with address', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-to=0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		})
		it('with amount & usd (ignores usd)', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-usd=1&form-amount=1.2345')
			form('amount').should('have.value', '1.2345')
			form('usd').invoke('val').should('match', regexNumber).should('not.eq', '1')
			form('to').should('have.value', '')
		})
		it('with amount & address', () =>
		{
			cy.visit('/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?chainId=4&form-to=0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0&form-amount=543.21')
			form('amount').should('have.value', '543.21')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0')
		})
	})
	describe('should open payment form in EOS', () =>
	{
		it('with amount', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with usd', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-usd=1.23')
			form('amount').invoke('val').should('match', regexNumber)
			form('usd').should('have.value', '1.23')
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with address', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-to=cryptoman222')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', 'cryptoman222')
			form('memo').should('have.value', '')
		})
		it('with memo', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-memo=hello%20world')
			form('amount').should('have.value', '')
			form('usd').should('have.value', '')
			form('to').should('have.value', '')
			form('memo').should('have.value', 'hello world')
		})
		it('with amount & usd (ignores usd)', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234&form-usd=1')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber).should('not.eq', '1')
			form('to').should('have.value', '')
			form('memo').should('have.value', '')
		})
		it('with amount & address & memo', () =>
		{
			cy.visit('/wallet/eos/cryptoman111/create?form-amount=25.1234&form-memo=hello%20world&form-to=cryptoman222')
			form('amount').should('have.value', '25.1234')
			form('usd').invoke('val').should('match', regexNumber)
			form('to').should('have.value', 'cryptoman222')
			form('memo').should('have.value', 'hello world')
		})
	})
	describe('should open /pay links', () =>
	{
		it('eth qr with amount & address', () =>
		{
			cy.visit('/pay/eth?chainId=4&form-to=0x30384424F1Ab508F1f82b58f1335f343ABdF68AE&form-amount=0.5')
			form('to').should('contain', '0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
			form('amount').should('contain', '0.5 ETH')
			cy.contains(/airgapped/i).click()
			cy.url().should('contain', '/login?')
				.should('contain', 'bcs=eth')
				.should('contain', 'redirect=%2Fsubw%2Fcreate%3FchainId%3D4%26form-to%3D0x30384424F1Ab508F1f82b58f1335f343ABdF68AE%26form-amount%3D0.5')
			checkShownQr(/^getWalletList\|\d*\|."blockchains".."eth"../)
			showQrText(qrs.login_single_eth_wallet)
			cy.url()
				.should('contain', '/wallet/eth/0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0/create?')
				.should('contain', 'form-to=0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
				.should('contain', 'form-amount=0.5')
			form('to').invoke('val').should('eq', '0x30384424F1Ab508F1f82b58f1335f343ABdF68AE')
			form('amount').invoke('val').should('eq', '0.5')
			cy.get('[data-cy=gas-slider]', { timeout: 10000 }).should('exist')
			cy.contains(/sign/i).click()
			checkShownQr(/^signTransferTx/)
		})
		it('eos webrtc with amount & address & memo', () =>
		{
			resetWebrtc(false)
			let webrtc = getWebrtc()
			webrtc.jrpc.switchToQueueMode()

			cy.visit('/pay/eos?form-to=cryptoman222&form-amount=0.2&form-memo=hello%20world')
			form('to').should('contain', 'cryptoman222')
			form('amount').should('contain', '0.2 EOS')
			form('memo').should('contain', 'hello world')
			cy.contains(/online/i).click()
			cy.url().should('contain', '/webrtc?')
				.should('contain', 'bcs=eos')
				.should('contain', 'redirect=%2Fsubw%2Fcreate%3F')
			
			connectWebrtc(['eos']).then(walletCallback =>
			{
				console.log('wallet callback')
				walletCallback(undefined, [{
					address: 'cryptoman111',
					blockchain:'eos'
				}])
			})

			cy.url()
				.should('contain', '/wallet/eos/cryptoman111/create?')
				.should('contain', 'form-to=cryptoman222')
				.should('contain', 'form-amount=0.2')
				.should('contain', 'form-memo=hello%20world')
			
			form('to').invoke('val').should('eq', 'cryptoman222')
			form('amount').invoke('val').should('eq', '0.2')
			form('memo').invoke('val').should('eq', 'hello world')
			
			cy.contains(/sign/i).click()
			cy.wrap(webrtc.jrpc.nextMessage()).then(tuple =>
			{
				let [json, cb] = tuple as RequestHandlerTuple<IHCSimple, string>
				expect(json.method).eq('signTransferTx')
			})
		})
		it('eos with long memo', () =>
		{
			let memo = 'lorem%20ipsum%20'.repeat(20)
			cy.visit(`/pay/eos?form-to=cryptoman222&form-memo=${memo}&form-amount=0.2`)
			form('to').should('contain', 'cryptoman222')
			form('amount').should('contain', '0.2 EOS')
			form('memo').should('contain', memo.replace(/%20/g, ' '))
		})
		it('eth qr incorrect login with eos', () =>
		{
			cy.visit('/pay/eth?chainId=4&form-to=0x30384424F1Ab508F1f82b58f1335f343ABdF68AE&form-amount=0.5')
			cy.contains(/airgapped/i).click()
			showQrText(qrs.login_single_eos_wallet)
			cy.get('[data-cy=login-error]').contains('incorrect')
			cy.wait(100)
			cy.url().should('not.contain', '/wallet')
			showQrText(qrs.login_single_eth_wallet)
			cy.url().should('contain', '/wallet')
		})
		it('eth webrtc incorrect login with eos', () =>
		{
			resetWebrtc(false)
			let webrtc = getWebrtc()
			webrtc.jrpc.switchToQueueMode()

			cy.visit('/pay/eth?chainId=4&form-to=0x30384424F1Ab508F1f82b58f1335f343ABdF68AE&form-amount=0.5')
			
			cy.contains(/online/i).click()

			connectWebrtc(['eth']).then(walletCallback =>
			{
				console.log('wallet callback')
				walletCallback(undefined, [{
					address: 'cryptoman111',
					blockchain:'eos'
				}])
				cy.get('[data-cy=login-error]').contains('incorrect')

				cy.wrap(webrtc.jrpc.nextMessage()).then(tuple =>
				{
					let [json, cb] = tuple as RequestHandlerTuple<IHCSimple, unknown[]>
					expect(json.method).eq('getWalletList')

					cy.url().should('not.contain', '/wallet')
					cb(undefined, [{
						address: '0x5DcD6E2D92bC4F96F9072A25CC8d4a3A4Ad07ba0',
						blockchain: 'eth'
					}])
					cy.url().should('contain', '/wallet')
				})
			})
		})
	})
})