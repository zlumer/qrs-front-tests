import { parseHostMessage, isMethodCall, isError, IHostCommand } from './hostproto'

export type Id = string | number | null

export function notify(method: string, params: {} | unknown[], reduced: boolean = false)
{
	if (reduced)
		return `${method}||${JSON.stringify(params)}`

	return jrpcs({
		method,
		params,
	})
}
export function error(id: Id | undefined, error: any)
{
	return jrpcs({
		id,
		error,
	})
}
export function result<T>(id: Id | undefined, result: T, reduced: boolean = false)
{
	if (reduced)
		return `|${id}|${JSON.stringify(result)}`

	return jrpcs({
		id,
		result,
	})
}
export function call(method: string, id: Id, params: unknown | unknown[], reduced: boolean = false)
{
	if (reduced)
		return `${method}|${id}|${JSON.stringify(params)}`

	return jrpcs({
		method,
		id,
		params,
	})
}
export function jrpc<T extends { id?: string | number | null; method?: string }>(obj: T): T & { jsonrpc: '2.0' }
{
	return Object.assign({}, obj, { jsonrpc: '2.0' as '2.0' })
}
export function jrpcs<T extends { id?: string | number | null; method?: string }>(obj: T)
{
	return JSON.stringify(jrpc(obj))
}

export type RequestHandler = (json: { id: Id; method: string; params: any[] | any }, callback: (err: any, result: any) => void) => void

export type RequestHandlerTuple<TCmd extends IHostCommand<unknown[], unknown>, TRes> = [TCmd, (err: any, result: TRes) => void]

type RequestHandlerTupleU = RequestHandlerTuple<
	IHostCommand<unknown[], unknown>,
	unknown
>

export class JsonRpc
{
	public send: (msg: string) => void
	public onRequest: RequestHandler

	lastOutgoingMsgId: number = 1

	listeners: { [id: number]: (err: any, json: any) => void } = {}

	constructor(send: (msg: string) => void, onRequest: RequestHandler)
	{
		this.send = send
		this.onRequest = onRequest
	}

	private _callbacksQueue = [] as RequestHandler[]
	private _messageQueue = [] as RequestHandlerTupleU[]
	private _queueMode = false
	public switchToQueueMode()
	{
		if (this._queueMode)
			return
		
		this._queueMode = true
		
		this.onRequest = (json, cb) =>
		{
			console.log(`JSONRPCD on_request\nqueue: ${this._messageQueue.map(x => x[0]).map(x => JSON.stringify(x)).join(', ')}`
				+ `\ncallbacks: ${this._callbacksQueue.length}`)
			// console.log('*** 1')
			if (this._callbacksQueue.length)
			{
				// console.log('*** 2')
				let m = this._callbacksQueue.shift()!
				// console.log('*** 3')
				m(json, cb)
				// console.log('*** 4')
			}
			else
			{
				// console.log('*** 5')
				this._messageQueue.push([json, cb])
				console.log(`JSONRPCD on_request (after)\nqueue: ${this._messageQueue.map(x => x[0]).map(x => JSON.stringify(x)).join(', ')}`
				+ `\ncallbacks: ${this._callbacksQueue.length}`)
				// console.log('*** 6')
			}
		}
	}
	public async nextMessage(): Promise<RequestHandlerTupleU>
	{
		console.log(`JSONRPCD next_message\nqueue: ${this._messageQueue.map(x => x[0]).map(x => JSON.stringify(x)).join(', ')}`
			+ `\ncallbacks: ${this._callbacksQueue.length}`)
		
		if (this._messageQueue.length)
			return Promise.resolve(this._messageQueue.shift()!)
		else
			return new Promise<RequestHandlerTupleU>((res, rej) =>
				{
					this._callbacksQueue.push((..._) => res(_))
					console.log(`JSONRPCD next_message(after)\nqueue: ${this._messageQueue.map(x => x[0]).map(x => JSON.stringify(x)).join(', ')}`
						+ `\ncallbacks: ${this._callbacksQueue.length}`)
				}
			)
	}
	public onMessage = (data: string) =>
	{
		// console.log('%%%! 1')
		let json = parseHostMessage(data)
		// console.log('%%%! 2')
		if (!json)
			return console.error(`JsonRpc: error parsing data!\n${data}`)
		
		// console.log('%%%! 3')
		let id = json.id as number
		// console.log('%%%! 4')
		if (isMethodCall(json))
		{
			// console.log('%%%! 5')
			this.onRequest(json, (error, result) =>
				(/* console.log('%%%! 6'),
				console.log(this.send.toString()), */
				this.send(
					JSON.stringify({
						id,
						jsonrpc: '2.0',
						...(error ? { error } : { result }),
					})
				))
			)
		}
		else if (this.listeners[id])
		{
			let m = this.listeners[id]
			delete this.listeners[id]
			if (isError(json))
				m(json.error, undefined)
			else
				m(undefined, json.result)
		}
	}
	public async ping()
	{
		let response = await this.call('ping')
		if (response != 'pong')
			throw 'JSON-RPC: unknown ping error!'
	}
	public async callRaw(method: string, args: {}): Promise<any>
	{
		console.log(`JSON.RAW: ${method}(${JSON.stringify(args)})`)
		return new Promise((res, rej) =>
		{
			let id = this.getNextMsgId()
			this.listeners[id] = (err, msg) => (err ? rej(err) : res(msg))
			console.log(`outgoing: ${call(method, id, args)}`)
			this.send(call(method, id, args))
		})
	}
	public async call(method: string, ...args: any[]): Promise<any>
	{
		return this.callRaw(method, args)
	}
	getNextMsgId()
	{
		return this.lastOutgoingMsgId++
	}
}
