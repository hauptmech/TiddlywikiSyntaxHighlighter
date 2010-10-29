dp.sh.Brushes.Cys = function () {
    var _ = "int double void",
        $ = "break case catch class const __finally __exception __try " + 
             "const_cast continue private public protected __declspec " + 
             "default delete deprecated dllexport dllimport do dynamic_cast " + 
             "else enum explicit extern if for friend goto inline " + 
             "mutable naked namespace new noinline noreturn nothrow " + 
             "register reinterpret_cast return selectany " + 
             "sizeof static static_cast struct switch template this " + 
             "thread throw true false try typedef typeid typename union " + 
             "using uuid virtual volatile whcar_t while";
    this.regexList = [{
        regex: dp.sh.RegexLib.SingleLineCysComments,
        css: "comment"
    },
    {
        regex: dp.sh.RegexLib.MultiLineCysComments,
        css: "comment"
    },
    {
        regex: dp.sh.RegexLib.DoubleQuotedString,
        css: "string"
    },
    {
        regex: new RegExp("[a-zA-Z]:|[a-zA-Z_][0-9a-zA-Z_]+:", "gm"),
        css: "label"
    },
    {
        regex: new RegExp("[-`~!@#$%^&*<>|+?=/\\\\]+", "gm"),
        css: "operatur"
    },
    {
        regex: new RegExp(this.GetKeywords(_), "gm"),
        css: "datatypes"
    },
    {
        regex: new RegExp(this.GetKeywords($), "gm"),
        css: "keyword"
    }];
    this.CssClass = "dp-cys";
    this.Style = ".dp-cys .datatypes { color: #2E8B57; font-weight: bold; }"
};
dp.sh.Brushes.Cys.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Cys.Aliases = ["cys", "cystem"];