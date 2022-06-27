module.exports = (req, vars) => {
  /*
  const keysArray = []
  const keys = key.split('.')

  //console.log(keys)
  let p = keys[0]
  const r = keys.reduce((array, key) => {
    console.log(array, p, key)
    array[p] = [key]
    p = key
    //console.log(a) 
    //[keysArray].push([key])
    return array
  }, [])
  console.log(keys.length, keys, r)
  */
  /*
  let translations = req.app.locals.translations
  const keys = key.split('.')
  do {
    let k = keys.shift()
    if (translations[k] === undefined) {
      return null
    }
    translations = translations[k]
  } while (keys.length > 0)
  return translations
  */
  let translations = req.app.locals.translations
  let key, value
  [key, value = null] = vars.split(' ')

  // fetch translated string for a given key
  key.split('.').every(k => {
    translations = translations[k]
    // break if the key is invalid
    return translations !== undefined
  })
  return translations?.replace('${value}', value) ?? key
}
