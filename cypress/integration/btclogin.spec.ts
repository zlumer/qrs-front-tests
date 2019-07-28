import { parseHostMessage, IHCSimple } from "../../src/helpers/webrtc/hostproto"
import { reset as resetWebrtc, getSingleton as getWebrtc } from "../../src/helpers/webrtc/webrtcsingleton"
import { RequestHandlerTuple } from "../../src/helpers/webrtc/jsonrpc"
import { connectWebrtc } from "./interact_webrtc"
import { checkShownQr, showQrText } from "./interact_qr"

interface IWallet
{
	blockchain: "btc"
	address: string
	chainId: string
}

describe('btc login & txs', () =>
{
	it('should generate BTC transfer', () =>
	{
		cy.visit('/wallet/btc/mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn?chainId=6f')
		cy.get('[data-cy=tx-list]').should('exist')
		cy.get('[data-cy=error]').should('not.exist')
		cy.contains(/send btc/i).click()

		cy.url().should('include', '/create')
		cy.get('[data-cy=form-to]').type(`mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn`)
		cy.get('[data-cy=form-amount]').type(`0.${'0'.repeat(7)}1`)
		cy.contains(/sign/i).click()
	})
})
