// assumes quad-dotted decimal notation for ip4
// assumes eight-part hex ip6 notation, does not support ip6 shortening
class IpParser {
	constructor(input = '') {
		this.input = input;
		this.inputPointer = 0;

		// ip6 hex input bounds
		this.aCode = 'a'.charCodeAt(0);
		this.fCode = 'f'.charCodeAt(0);
		this.ACode = 'A'.charCodeAt(0);
		this.FCode = 'F'.charCodeAt(0);

		// ip4 and ip6 numeric bounds
		this.zeroCode = '0'.charCodeAt(0);
		this.nineCode = '9'.charCodeAt(0);

		// separators for both ip4 and ip6
		this.separators = {':': true, '.': true};
		this.separatorIsNextToken = false;

		// note: for ipv6, rfc recommends
		// uppercase hex, but the parser will accept both
		this.ip6MaxLength = 39;
		this.ip4MaxLength = 15;

		this.mode = null;
		this.ip4LegacyMode = true;
		this.address = [];
		this.sepCount = 0;
	}

	enableIp6Parsing() {
		this.ip4LegacyMode = false;
	}

	reset() {
		this.input = '';
		this.inputPointer = 0;
		this.mode = null;
		this.address = [];
		this.sepCount = 0;
		this.separatorIsNextToken = false;
	}

	throw(error) {
		// centralize error throwing
		// to ease the unit testing process
		throw error;
	}

	parse(input) {
		if (input) {
			this.reset();
			this.input = input;
		}

		if (!this.input) this.throw(new Error(
			'missing input'));

		// detect ip version
		let error = this.detectIpVersion();
		if (error) this.throw(error);

		// run constant time sanity check
		// before further processing
		if (this.isIp4Mode()) error = this.ip4SanityCheck();
		if (this.isIp6Mode()) error = this.ip6SanityCheck();
		if (error) this.throw(error);

		// process the address token by token
		let token = this.getToken();
		while (token !== null) {
			// In an effort to avoid multiple passes over the input,
			// validation errors are meant to be surfaced as token
			// processing occurs. Validation logic is kept close
			// to the token processing logic itself in an attempt to
			// contain cognitive load for the reader...
			// in the event of an error, the token will be an error obj
			if (token instanceof Error) this.throw(token);

			switch (true) {
				case this.separatorIsNextToken:
					this.sepCount++;
					error = this.checkSepCount();
					if (error) this.throw(error);
					this.separatorIsNextToken = false;
					break;
				case this.isIp4Mode():
					this.address.push(token);
					this.separatorIsNextToken = true;
					break;
				case this.isIp6Mode():
					this.address.push(token);
					this.separatorIsNextToken = true;
					break;
			}

			if (error) this.throw(error);
			token = this.getToken();
		}

		// final size check
		let l = this.address.length;
		if (this.isIp4Mode() && l !== 4) this.throw(new Error(
			`unexpected ip4 address length with ${l} octets -- ip:${this.input.slice(0, this.ip4MaxLength)}`));
		if (this.isIp6Mode() && l !== 8) this.throw(new Error(
			`unexpected ip6 address length with ${l} hex values -- ip:${this.input.slice(0, this.ip6MaxLength)}`));

		// accepted input
		return this.address;
	}

	detectIpVersion() {
		if (this.ip4LegacyMode) {
			this.mode = 'ip4';
			return null;
		}

		// O(1) check
		let i = 0;
		for (; i <= 4; i++) {
			if (this.input[i] === '.') {
				this.mode = 'ip4';
				break;
			}
			if (this.input[i] === ':') {
				this.mode = 'ip6';
				break;
			}
		}

		if (this.isIp4Mode() && i > 3
			|| this.mode === null)
			return new Error(
				`unable to detect ip version, ` +
				`missing initial separator used for detection -- ip:${this.input.slice(0, this.ip6MaxLength)}`);

		return null;
	}

	ip4SanityCheck() {
		if (this.input > this.ip4MaxLength) return new Error(
			`invalid number of characters for ip4 address -- ip:${this.input.slice(0, this.ip4MaxLength)}...`);
	}

	ip6SanityCheck() {
		if (this.input > this.ip6MaxLength) return new Error(
			`invalid number of characters for ip6 address -- ip:${this.input.slice(0, this.ip6MaxLength)}...`);
	}

	isIp4Mode() {
		return this.mode === 'ip4';
	}

	isIp6Mode() {
		return this.mode === 'ip6';
	}

	getToken() {
		if (this.inputPointer === this.input.length) return null;

		if (this.separatorIsNextToken) return this.getSeparatorToken();
		else if (this.isIp4Mode()) return this.getIp4OctetToken();
		else if (this.isIp6Mode()) return this.getIp6HexToken();
		else return new Error('parser in unexpected state');
	}

	getSeparatorToken() {
		let sep = this.input[this.inputPointer];
		this.inputPointer++;

		if (this.isIp4Mode() && sep !== '.') return new Error(
			`expected ip4 separator(.), got ${sep} -- ip:${this.input.slice(0, this.ip4MaxLength)}`);
		if (this.isIp6Mode() && sep !== ':') return new Error(
			`expected ip6 separator(:), got ${sep} -- ip:${this.input.slice(0, this.ip6MaxLength)}`);

		return sep;
	}

	getIp4OctetToken() {
		let i = this.inputPointer;
		let j = i;
		while (j < i + 3 && j < this.input.length) {
			if (this.isNumeric(this.input[j])) j++;
			else if (j !== i && this.input[j] === '.') break;
			else return new Error(
					`invalid ip4 character(${this.input[j]}) in octet -- ip:${this.input.slice(0, this.ip4MaxLength)}`);
		}

		let token = this.input.substring(i, j);
		this.inputPointer = j;

		if (token[0] === '0' && token.length > 1)
			return new Error(`ip4 octet(${token}) cannot have leading zeroes -- ip:${this.input.slice(0, this.ip4MaxLength)}`);

		let octet = parseInt(token, 10);
		if (octet > 255)
			return new Error(`invalid octet(${octet}) in ip4 -- ip:${this.input.slice(0, this.ip4MaxLength)}`);

		return octet;
	}

	getIp6HexToken() {
		let i = this.inputPointer;
		let j = i;
		while (j < i + 4 && j < this.input.length) {
			if (this.isValidHex(this.input[j])) j++;
			else if (j !== i && this.input[j] === ':') break;
			else return new Error(
					`invalid ip6 character(${this.input[j]}) in hex -- ip:${this.input.slice(0, this.ip6MaxLength)}`);
		}

		// check range is 0-65535
		let token = this.input.substring(i, j);
		this.inputPointer = j;
		return parseInt(token, 16);
	}

	isNumeric(c) {
		let code = c.charCodeAt(0);
		return this.zeroCode <= code && code <= this.nineCode;
	}

	isValidHex(c) {
		let code = c.charCodeAt(0);
		let isNumeric = this.isNumeric(c);
		let isLowerHex = this.aCode <= code && code <= this.fCode;
		let isUpperHex = this.ACode <= code && code <= this.FCode;
		return isNumeric || isLowerHex || isUpperHex;
	}

	checkSepCount() {
		if (this.isIp4Mode() && this.sepCount > 3)
			return new Error(`ip4 cannot have have more than 3 separators(.) -- ip:${this.input.slice(0, this.ip4MaxLength)}`);
		if (this.isIp6Mode() && this.sepCount > 7)
			return new Error(`ip6 cannot have more than 7 separators(:) -- ip:${this.input.slice(0, this.ip6MaxLength)}`);
		return null;
	}
}

module.exports = IpParser;
