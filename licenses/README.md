# Bundled dependency license fallbacks

Some installed npm packages declare MIT licensing but omit the license file from
their published archive. `build-single.mjs` uses these unmodified upstream texts
only when a bundled package has no license file, its repository matches, and its
package metadata declares MIT. Builds do not fetch licenses from the network.

| File | Upstream source | Git blob SHA-1 |
| --- | --- | --- |
| `fluentui-system-icons.LICENSE` | [microsoft/fluentui-system-icons — LICENSE](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE), used by `@fluentui/react-icons` | `bc9c36b28f467f7006c4e5f1be4ca0a1a0b895f3` |
| `micromark.LICENSE` | [micromark/micromark — license at 4.0.0](https://github.com/micromark/micromark/blob/4.0.0/license), shared by its workspace packages | `39372356c47d0f6e070ff62d84c69f4f5e8c16eb` |
| `inline-style-parser.LICENSE` | [remarkablemark/inline-style-parser — LICENSE](https://github.com/remarkablemark/inline-style-parser/blob/master/LICENSE) | `0239d9c6c02d5b622a68103b2eaa44c7817ff936` |

The texts are included in both the standalone HTML and the extension's
`third-party-licenses.txt`.
