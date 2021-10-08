### Generate Setter for ID's ###
```
function fix(s) {
  var t = [];
  var e = s.split('\n');
  for(var i=0;i<e.length;i++) {
    var cI = e[i];
    cI = cI.trim().trimStart();
    cI = cI.replace("private static ", "");
    cI = cI.replace(": string = '';", "");
    cI = cI.replace(": string;", "");
    var cL = `${cI.charAt(0).toUpperCase()}${cI.substr(1)}`;
    t.push(`public static set${cL}(value: string): void {\n\tthis.${cI} = value;\n}`);
  }
  console.log(t.join("\n\n"));
}
fix(`YOUR_DECLARATIONS_COME_HERE`);
```