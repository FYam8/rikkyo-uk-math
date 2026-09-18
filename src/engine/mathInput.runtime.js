var CanonicalMathInput = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/engine/mathInput.ts
  var mathInput_exports = {};
  __export(mathInput_exports, {
    canonicalMathKeys: () => canonicalMathKeys,
    deleteCanonicalMathText: () => deleteCanonicalMathText,
    insertCanonicalMathText: () => insertCanonicalMathText
  });
  var canonicalMathKeys = [{ label: "\u5206\u6570 a/b", text: "/" }, { label: "\u221A", text: "\u221A()" }, { label: "x\xB2", text: "^2" }, { label: "( )", text: "()" }, { label: "\u2212", text: "-" }, { label: "\xB1", text: "\xB1" }, { label: "\u03C0", text: "\u03C0" }, { label: ":", text: ":" }, { label: ",", text: "," }, { label: "\u2266", text: "\u2266" }, { label: "\u2267", text: "\u2267" }, { label: "\uFF1C", text: "<" }, { label: "\uFF1E", text: ">" }, { label: "\uFF1D", text: "=" }];
  function insertCanonicalMathText(value, selection, text) {
    const start = Math.min(selection.start, value.length), end = Math.min(selection.end, value.length);
    return { value: value.slice(0, start) + text + value.slice(end), position: start + text.length - (text.endsWith("()") ? 1 : 0) };
  }
  function deleteCanonicalMathText(value, selection) {
    const start = Math.min(selection.start, value.length), end = Math.min(selection.end, value.length);
    const position = start === end ? Math.max(0, start - 1) : start;
    return { value: value.slice(0, position) + value.slice(end), position };
  }
  return __toCommonJS(mathInput_exports);
})();
