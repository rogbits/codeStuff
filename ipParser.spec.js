let assert = require('assert');
let IpParser = require('./ipParser');

describe('IpParser', () => {
	it('has a set of known properties', function () {
		let ipParser = new IpParser();
		assert(ipParser.hasOwnProperty('input'));
		assert(ipParser.input === '');
		assert(ipParser.hasOwnProperty('inputPointer'));
		assert(ipParser.inputPointer === 0);
		assert(ipParser.hasOwnProperty('aCode'));
		assert(ipParser.aCode === 'a'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('fCode'));
		assert(ipParser.fCode === 'f'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('ACode'));
		assert(ipParser.ACode === 'A'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('FCode'));
		assert(ipParser.FCode === 'F'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('zeroCode'));
		assert(ipParser.zeroCode === '0'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('nineCode'));
		assert(ipParser.nineCode === '9'.charCodeAt(0));
		assert(ipParser.hasOwnProperty('separators'));
		assert(':' in ipParser.separators);
		assert('.' in ipParser.separators);
		assert(ipParser.hasOwnProperty('ip6MaxLength'));
		assert(ipParser.ip6MaxLength === 39);
		assert(ipParser.hasOwnProperty('ip4MaxLength'));
		assert(ipParser.ip4MaxLength === 15);
		assert(ipParser.hasOwnProperty('mode'));
		assert(ipParser.mode === null);
		assert(ipParser.hasOwnProperty('ip4LegacyMode'));
		assert(ipParser.mode === null);
		assert(ipParser.hasOwnProperty('address'));
		assert(ipParser.address.length === 0);
		assert(ipParser.hasOwnProperty('sepCount'));
		assert(ipParser.sepCount === 0);
	});

	it('defaults in legacy mode', function () {
		let ipParser = new IpParser();
		assert(ipParser.ip4LegacyMode === true);
	});

	it('has a method to enable ip6 parsing', function () {
		let ipParser = new IpParser();
		ipParser.enableIp6Parsing();
		assert(ipParser.ip4LegacyMode === false);
	});

	it('has a method to reset its state', function () {
		let ipParser = new IpParser('1.1.1.1');
		ipParser.inputPointer = 1;
		ipParser.separatorIsNextToken = true;
		ipParser.mode = 'ip4';
		ipParser.address = [1, 1, 1, 1];
		ipParser.sepCount = 3;

		ipParser.reset();
		assert(ipParser.input === '');
		assert(ipParser.inputPointer === 0);
		assert(ipParser.mode === null);
		assert(ipParser.address.length === 0);
		assert(ipParser.separatorIsNextToken === false);
		assert(ipParser.sepCount === 0);
	});

	it('has a centralized method within the class for throwing errors', function () {
		let ipParser = new IpParser();
		try {
			ipParser.throw(new Error('testing'));
		} catch (e) {
			assert(e.message === 'testing');
		}
	});

	it('can detect the ip version based on the initial separator', function () {
		let ipParser = new IpParser();
		ipParser.enableIp6Parsing();
		let table = [
			['1.', 'ip4'],
			['11.', 'ip4'],
			['111.', 'ip4'],
			['1:', 'ip6'],
			['11:', 'ip6'],
			['111:', 'ip6'],
			['1111:', 'ip6'],
		];

		for (let [prefix, mode] of table) {
			ipParser.reset();
			ipParser.input = prefix;
			let error = ipParser.detectIpVersion();
			assert(error === null);
			assert(ipParser.mode === mode);
		}
	});

	it('will skip detection in legacy mode', function () {
		let ipParser = new IpParser();
		assert(ipParser.ip4LegacyMode === true);

		let error = ipParser.detectIpVersion();
		assert(error === null);
	});

	it('will throw an error during version detection ' +
		'if it cannot find an expected separator', function () {
		let ipParser = new IpParser();
		ipParser.enableIp6Parsing();
		let table = [
			'1111.',
			'11111:',
		];
		for (let prefix of table) {
			ipParser.reset();
			ipParser.input = prefix;
			let error = ipParser.detectIpVersion();
			assert(error);
			assert(error.message === 'unable to detect ip version, ' +
				`missing initial separator used for detection -- ip:${prefix}`);
		}
	});

	it('has a simple ip4 sanity check to avoid O(n) processing', function () {
		let ipParser = new IpParser();
		ipParser.input = '1'.repeat(ipParser.ip4MaxLength + 1);
		let error = ipParser.ip4SanityCheck();
		assert(error);
		assert(error.message === `invalid number of characters for ip4 address -- ip:111111111111111...`);
	});

	it('has a simple ip6 sanity check to avoid O(n) processing', function () {
		let ipParser = new IpParser();
		ipParser.input = '1'.repeat(ipParser.ip6MaxLength + 1);
		let error = ipParser.ip6SanityCheck();
		assert(error);
		assert(error.message === 'invalid number of characters for ip6 address -- ip:111111111111111111111111111111111111111...');
	});

	it('has a simple predicate method to assert ip4 for convenience', function () {
		let ipParser = new IpParser();
		ipParser.mode = 'ip4';
		assert(ipParser.isIp4Mode());

		ipParser.mode = null;
		assert(!ipParser.isIp4Mode());

		ipParser.mode = 'ip6';
		assert(!ipParser.isIp4Mode());
	});

	it('has a simple predicate method to assert ip6 for convenience', function () {
		let ipParser = new IpParser();
		ipParser.mode = 'ip6';
		assert(ipParser.isIp6Mode());

		ipParser.mode = null;
		assert(!ipParser.isIp6Mode());

		ipParser.mode = 'ip4';
		assert(!ipParser.isIp6Mode());
	});

	it('parses separator tokens for ip4', function () {
		let ipParser = new IpParser();
		ipParser.mode = 'ip4';
		ipParser.separatorIsNextToken = true;
		ipParser.input = '.';
		let sep = ipParser.getSeparatorToken();
		assert(sep === '.');
	});

	it('surfaces an error on unexpected separator tokens for ip4', function () {
		let ipParser = new IpParser();
		let table = [
			[':', 'expected ip4 separator(.), got : -- ip::'],
			['1', 'expected ip4 separator(.), got 1 -- ip:1'],
			['f', 'expected ip4 separator(.), got f -- ip:f'],
			['_', 'expected ip4 separator(.), got _ -- ip:_'],
			['z', 'expected ip4 separator(.), got z -- ip:z']
		];
		for (let [input, errorMsg] of table) {
			ipParser.mode = 'ip4';
			ipParser.separatorIsNextToken = true;
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let sep = ipParser.getSeparatorToken();
			assert(sep instanceof Error);
			assert(sep.message === errorMsg);
		}
	});

	it('parses separator tokens for ip6', function () {
		let ipParser = new IpParser();
		ipParser.mode = 'ip6';
		ipParser.separatorIsNextToken = true;
		ipParser.input = ':';
		let sep = ipParser.getSeparatorToken();
		assert(sep === ':');
	});

	it('surfaces an error on unexpected separator tokens for ip6', function () {
		let ipParser = new IpParser();
		let table = [
			['.', 'expected ip6 separator(:), got . -- ip:.'],
			['1', 'expected ip6 separator(:), got 1 -- ip:1'],
			['f', 'expected ip6 separator(:), got f -- ip:f'],
			['_', 'expected ip6 separator(:), got _ -- ip:_'],
			['z', 'expected ip6 separator(:), got z -- ip:z']
		];
		for (let [input, errorMsg] of table) {
			ipParser.mode = 'ip6';
			ipParser.separatorIsNextToken = true;
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let sep = ipParser.getSeparatorToken();
			assert(sep instanceof Error);
			assert(sep.message === errorMsg);
		}
	});

	it('parses ip4 octet tokens during ip4 processing', function () {
		let ipParser = new IpParser();
		let table = [
			['123.', 123],
			['123', 123], // ending octet
			['11.', 11],
			['11', 11],   // ending octet
			['23.', 23],
			['45.', 45],
			['67.', 67],
			['89.', 89],
			['1.', 1],
			['2.', 2],
			['3.', 3],
			['0.', 0],
		];
		for (let [input, expectedToken] of table) {
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let token = ipParser.getIp4OctetToken();
			assert(token === expectedToken);
		}
	});

	it('can detect invalid characters during  ip4 octet token parsing', function () {
		let ipParser = new IpParser();
		let table = [
			['12a.', 'invalid ip4 character(a) in octet -- ip:12a.'],
			['1b1.', 'invalid ip4 character(b) in octet -- ip:1b1.'],
			['c11.', 'invalid ip4 character(c) in octet -- ip:c11.'],
			['001.', 'ip4 octet(001) cannot have leading zeroes -- ip:001.'],
			['01.', 'ip4 octet(01) cannot have leading zeroes -- ip:01.'],
			['00.', 'ip4 octet(00) cannot have leading zeroes -- ip:00.'],
			['256.', 'invalid octet(256) in ip4 -- ip:256.'],
			['456.', 'invalid octet(456) in ip4 -- ip:456.'],
		];
		for (let [input, errorMsg] of table) {
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let octet = ipParser.getIp4OctetToken();
			assert(octet instanceof Error);
			assert(octet.message === errorMsg);
		}
	});

	it('parses ip6 hex tokens during ip6 parsing', function () {
		let ipParser = new IpParser();
		let table = [
			['aaaa:', 43690],
			['AAAA:', 43690],
			['AAAA', 43690], // ending hex
			['ffff:', 65535],
			['ffff', 65535], // ending hex
			['FFFF:', 65535],
			['FfFf:', 65535],
			['123:', 291],
			['1:', 1],
			['0:', 0],
		];
		for (let [input, expectedToken] of table) {
			ipParser.mode = 'ip6';
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let token = ipParser.getIp6HexToken();
			assert(token === expectedToken);
		}
	});

	it('can detect invalid characters during  ip6 hex token parsing', function () {
		let ipParser = new IpParser();
		let table = [
			['aaG:', 'invalid ip6 character(G) in hex -- ip:aaG:'],
			['aag:', 'invalid ip6 character(g) in hex -- ip:aag:'],
			['aa.', 'invalid ip6 character(.) in hex -- ip:aa.'],
			['123.', 'invalid ip6 character(.) in hex -- ip:123.'],
		];
		for (let [input, errorMsg] of table) {
			ipParser.mode = 'ip6';
			ipParser.input = input;
			ipParser.inputPointer = 0;
			let octet = ipParser.getIp6HexToken();
			assert(octet instanceof Error);
			assert(octet.message === errorMsg);
		}
	});

	it('has an entry method called getToken which calls ' +
		'the appropriate token parser based on the state of the parser', () => {

		let ipParser = new IpParser();

		let getSeparatorTokenCalled = false;
		let getIp4OctetTokenCalled = false;
		let getIp6HexTokenCalled = false;

		ipParser.getSeparatorToken = () => getSeparatorTokenCalled = true;
		ipParser.getIp4OctetToken = () => getIp4OctetTokenCalled = true;
		ipParser.getIp6HexToken = () => getIp6HexTokenCalled = true;
		ipParser.throw = () => null;

		ipParser.input = 'testing';
		ipParser.separatorIsNextToken = true;
		ipParser.getToken();
		assert(getSeparatorTokenCalled);

		ipParser.separatorIsNextToken = false;
		ipParser.mode = 'ip4';
		ipParser.getToken();
		assert(getIp4OctetTokenCalled);

		ipParser.separatorIsNextToken = false;
		ipParser.mode = 'ip6';
		ipParser.getToken();
		assert(getIp6HexTokenCalled);

		ipParser.mode = null;
		ipParser.separatorIsNextToken = false;
		let error = ipParser.getToken();
		assert(error.message === 'parser in unexpected state');
	});

	it('will return a null token when input parsing is complete', function () {
		let ipParser = new IpParser();
		ipParser.input = '1.1.1.1';
		ipParser.inputPointer = '1.1.1.1'.length;
		let token = ipParser.getToken();
		assert(token === null);
	});

	it('has a method to see if a character is numeric', function () {
		let ipParser = new IpParser();
		let table = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
		for (let c of table) assert(ipParser.isNumeric(c));

		assert(!ipParser.isNumeric('.'));
		assert(!ipParser.isNumeric(':'));
		assert(!ipParser.isNumeric('a'));
		assert(!ipParser.isNumeric('A'));
		assert(!ipParser.isNumeric('f'));
		assert(!ipParser.isNumeric('F'));
		assert(!ipParser.isNumeric('_'));
	});

	it('has a method to see if a character is valid hex ', function () {
		let ipParser = new IpParser();
		let table = [
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'a', 'b', 'c', 'd', 'e', 'f',
			'A', 'B', 'C', 'D', 'E', 'F'
		];
		for (let c of table) assert(ipParser.isValidHex(c));

		assert(!ipParser.isValidHex('.'));
		assert(!ipParser.isValidHex(':'));
		assert(!ipParser.isValidHex('g'));
		assert(!ipParser.isValidHex('G'));
		assert(!ipParser.isValidHex('z'));
		assert(!ipParser.isValidHex('Z'));
		assert(!ipParser.isNumeric('_'));
	});

	it('has a method for validating the sep count', function () {
		let ipParser = new IpParser();
		for (let i = 0; i <= 3; i++) {
			ipParser.sepCount = i;
			ipParser.mode = 'ip4';
			let error = ipParser.checkSepCount();
			assert(error === null);
		}
		for (let i = 0; i <= 7; i++) {
			ipParser.sepCount = i;
			ipParser.mode = 'ip6';
			let error = ipParser.checkSepCount();
			assert(error === null);
		}

		ipParser.sepCount = 4;
		ipParser.mode = 'ip4';
		ipParser.input = '1.1.1.1.1';
		let error = ipParser.checkSepCount();
		assert(error.message === 'ip4 cannot have have more than 3 separators(.) -- ip:1.1.1.1.1');

		ipParser.sepCount = 8;
		ipParser.mode = 'ip6';
		ipParser.input = '1:1:1:1:1:1:1:1:1';
		error = ipParser.checkSepCount();
		assert(error.message === 'ip6 cannot have more than 7 separators(:) -- ip:1:1:1:1:1:1:1:1:1');
	});

	it('has a client method called parse', function () {
		let ipParser = new IpParser();
		assert(ipParser.__proto__.hasOwnProperty('parse'));
	});

	it('will call reset when parse is passed input, ' +
		'so that the parser is reusable', function () {
		let ipParser = new IpParser('1.1.1.1');
		let resetCalled = false;
		ipParser.reset = () => resetCalled = true;
		ipParser.parse('2.2.2.2');
		assert(resetCalled);
	});

	it('will call detectIpVersion when parse is called', function () {
		let ipParser = new IpParser('1.1.1.1');
		ipParser.mode = 'ip4';

		let detectIpVersionCalled = false;
		ipParser.throw = () => null;
		ipParser.detectIpVersion = () => detectIpVersionCalled = true;
		ipParser.parse();
		assert(detectIpVersionCalled);
	});

	it('will call the appropriate sanity check in the parse call', function () {
		let ipParser = new IpParser();
		ipParser.enableIp6Parsing();

		let ip4SanityCheckCalled = false;
		let ip6SanityCheckCalled = false;
		ipParser.throw = () => null;
		ipParser.ip4SanityCheck = () => ip4SanityCheckCalled = true;
		ipParser.ip6SanityCheck = () => ip6SanityCheckCalled = true;

		ipParser.parse('1.1.1.1');
		assert(ip4SanityCheckCalled);

		ipParser.parse('0:0:0:0:0:0:0:0');
		assert(ip6SanityCheckCalled);
	});

	it('will parse ip addresses', function () {
		let ipParser = new IpParser();
		ipParser.enableIp6Parsing();
		let table = [
			['1.1.1.1', [1, 1, 1, 1]],
			['0.0.0.0', [0, 0, 0, 0]],
			['192.168.1.1', [192, 168, 1, 1]],
			['10.0.0.1', [10, 0, 0, 1]],
			['255.255.255.255', [255, 255, 255, 255]],
			['0.0.0.1', [0, 0, 0, 1]],
			['ff:ff:ff:ff:ff:ff:ff:ff', [255, 255, 255, 255, 255, 255, 255, 255]],
			['FFFF:AAAA:FFFF:AAAA:FFFF:AAAA:FFFF:AAAA', [65535, 43690, 65535, 43690, 65535, 43690, 65535, 43690]],
			['0:0:0:0:0:0:0:0', [0, 0, 0, 0, 0, 0, 0, 0]],
			['1:1:1:1:1:1:1:1', [1, 1, 1, 1, 1, 1, 1, 1]],
		];

		for (let [input, expectedAddr] of table) {
			let addr = ipParser.parse(input);
			assert(addr.length === expectedAddr.length);
			for (let i = 0; i < addr.length; i++) {
				assert(addr[i] === expectedAddr[i]);
			}
		}
	});

	it('will surface errors on parsing failures', () => {
		let ipParser = new IpParser();
		let table = [
			['', 'legacy', 'missing input'],
			['', 'dual', 'missing input'],
			['0', 'legacy', 'unexpected ip4 address length with 1 octets -- ip:0'],
			['0', 'dual', 'unable to detect ip version, missing initial separator used for detection -- ip:0'],
			['1...', 'legacy', 'invalid ip4 character(.) in octet -- ip:1...'],
			['1..', 'legacy', 'invalid ip4 character(.) in octet -- ip:1..'],
			['1..', 'dual', 'invalid ip4 character(.) in octet -- ip:1..'],
			['1.', 'legacy', 'unexpected ip4 address length with 1 octets -- ip:1.'],
			['1.', 'dual', 'unexpected ip4 address length with 1 octets -- ip:1.'],
			['1.1', 'legacy', 'unexpected ip4 address length with 2 octets -- ip:1.1'],
			['1.1', 'dual', 'unexpected ip4 address length with 2 octets -- ip:1.1'],
			['1.1.1.1:8080', 'legacy', 'invalid ip4 character(:) in octet -- ip:1.1.1.1:8080'],
			['1.1.1.1:8080', 'dual', 'invalid ip4 character(:) in octet -- ip:1.1.1.1:8080'],
			['300.1.1.1', 'legacy', 'invalid octet(300) in ip4 -- ip:300.1.1.1'],
			['300.1.1.1', 'dual', 'invalid octet(300) in ip4 -- ip:300.1.1.1'],
			['1z.1.1.1', 'legacy', 'invalid ip4 character(z) in octet -- ip:1z.1.1.1'],
			['1z.1.1.1', 'dual', 'invalid ip4 character(z) in octet -- ip:1z.1.1.1'],
			['01.1.1.1', 'legacy', 'ip4 octet(01) cannot have leading zeroes -- ip:01.1.1.1'],
			['01.1.1.1', 'dual', 'ip4 octet(01) cannot have leading zeroes -- ip:01.1.1.1'],
			['ff:ff:ff:ff:ff:ff:ff:ff', 'legacy', 'invalid ip4 character(f) in octet -- ip:ff:ff:ff:ff:ff:'],
			['FFFF:AAAA:FFFF:AAAA:FFFF:AAAA:FFFF:AAAA', 'legacy', 'invalid ip4 character(F) in octet -- ip:FFFF:AAAA:FFFF:'],
			['0:0:0:0:0:0:0.0', 'dual', 'invalid ip6 character(.) in hex -- ip:0:0:0:0:0:0:0.0'],
			['aaaaa:1:1:1:1:1:1:1', 'dual', 'unable to detect ip version, missing initial separator used for detection -- ip:aaaaa:1:1:1:1:1:1:1'],
			['aaaa:1::1:1:1:1:1:1', 'dual', 'invalid ip6 character(:) in hex -- ip:aaaa:1::1:1:1:1:1:1'],
			['aaaa:aaaaa:1:1:1:1:1:1', 'dual', 'expected ip6 separator(:), got a -- ip:aaaa:aaaaa:1:1:1:1:1:1'],
			['ag:1:1:1:1:1:1:1', 'dual', 'invalid ip6 character(g) in hex -- ip:ag:1:1:1:1:1:1:1'],
			['1:::::::', 'dual', 'invalid ip6 character(:) in hex -- ip:1:::::::'],
			['1::::', 'dual', 'invalid ip6 character(:) in hex -- ip:1::::'],
		];

		for (let [input, parserMode, errorMsg] of table) {
			try {
				ipParser.ip4LegacyMode = parserMode === 'legacy';
				let addr = ipParser.parse(input);
				assert(addr === 'should always catch');
			} catch (e) {
				assert(e.message === errorMsg);
			}
		}
	});
});
