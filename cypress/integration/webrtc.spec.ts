import * as Simple from "simple-peer"

describe('webrtc test', () =>
{
	it('should find webrtc candidates', () =>
	{
		console.log(Simple)
		let p = new Simple({
			initiator: true,
			trickle: false,
		})
		p.on('signal', s =>
		{
			console.log(s)
		})
	})
})