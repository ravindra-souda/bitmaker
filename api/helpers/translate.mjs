const translateSingleMessage = (translations, key, values = {}) => {
  if (values?.constructor !== Object) {
    return key
  }

  // fetch translated string for a given key
  key.split('.').every((k) => {
    translations = translations[k]
    // break if the key is invalid
    return translations !== undefined
  })

  // values interpolation
  Object.entries(values).map(
    ([placeholder, value]) =>
      (translations = translations.replace('${' + placeholder + '}', value))
  )

  return translations ?? key
}

const translateValidationMessages = (translations, messages) => {
  return messages.value.map((args) => {
    let [message, value] = args.split(',,')
    return value === undefined
      ? translateSingleMessage(translations, message)
      : translateSingleMessage(translations, message, JSON.parse(value))
  })
}

export default (translations, key, values = {}) => {
  if (key.value?.constructor === Array) {
    return translateValidationMessages(translations, key)
  }

  return translateSingleMessage(translations, key, values)
}
