dp.sh.Brushes.Batch = function()
{
    var builtins =  'APPEND ATTRIB CD CHDIR CHKDSK CHOICE CLS COPY DEL ERASE DELTREE ' +
                    'DIR EXIT FC COMP FDISK FIND FORMAT FSUTIL HELP JOIN ' +
                    'LABEL LOADFIX MK MKDIR MEM MEMMAKER MORE MOVE MSD PCPARK ' +
                    'PRINT RD RMDIR REN SCANDISK SHARE SORT SUBST SYS ' +
                    'TIME DATE TREE TRUENAME TYPE UNDELETE VER XCOPY';

    var keywords =  'DO ELSE FOR IN CALL CHOICE GOTO SHIFT PAUSE ERRORLEVEL ' +
      'IF NOT EXIST LFNFOR START SETLOCAL ENDLOCAL ECHO SET';

    this.regexList = [
 {regex: new RegExp('REM.*$', 'gm'), css: 'comment'},
 {regex: new RegExp('::.*$', 'gm'), css: 'comment'},
 {regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string'},
 {regex: dp.sh.RegexLib.SingleQuotedString, css: 'string'},
 {regex: new RegExp('[()[\\]{}]', 'g'), css: 'delim'},
 {regex: new RegExp('%\\w+%', 'g'), css: 'vars'},
 {regex: new RegExp('%%\\w+', 'g'), css: 'vars'},
 {regex: new RegExp('\\w+=', 'g'), css: 'vars'},
 {regex: new RegExp('@\\w+', 'g'), css: 'keyword'},
 {regex: new RegExp(':\\w+', 'g'), css: 'keyword'},
 {regex: new RegExp('\\s/\\w+', 'g'), css: 'flag'},
 {regex: new RegExp(this.GetKeywords(builtins), 'gm'), css: 'builtin'},
 {regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword'}
 ];

    this.CssClass = 'dp-batch';

    this.Style =    '.dp-batch .builtin {color: maroon; font-weight: bold;}' +
                    '.dp-batch .comment {color: gray;}' +
                    '.dp-batch .delim {font-weight: bold;}' +
                    '.dp-batch .flag {color: green;}' +
                    '.dp-batch .string {color: red;}' +
                    '.dp-batch .vars {color: blue;font-weight: bold;}';

}

dp.sh.Brushes.Batch.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Batch.Aliases = ['batch', 'dos'];
