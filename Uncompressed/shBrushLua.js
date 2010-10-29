dp.sh.Brushes.Lua = function()
{
	var keywords =	'break do end else elseif function if local nil not or repeat return and then until while this';
	var funcs = 'math\\.\\w+ string\\.\\w+ os\\.\\w+ debug\\.\\w+ io\\.\\w+ error fopen dofile coroutine\\.\\w+ arg getmetatable ipairs loadfile loadlib loadstring longjmp print rawget rawset seek setmetatable assert tonumber tostring';

	this.regexList = [
		{ regex: new RegExp('--\\[\\[[\\s\\S]*\\]\\]--', 'gm'),		css: 'comment'},
		{ regex: new RegExp('--[^\\[]{2}.*$', 'gm'),			css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,			css: 'string' },	// strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,			css: 'string' },	// strings
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' },			// keyword
		{ regex: new RegExp(this.GetKeywords(funcs), 'gm'),		css: 'func' },			// functions
		];

	this.CssClass = 'dp-lua';
}

dp.sh.Brushes.Lua.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Lua.Aliases	= ['lua'];

