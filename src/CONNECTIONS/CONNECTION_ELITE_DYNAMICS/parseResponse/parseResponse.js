const { exec } = require('child_process')

// https://stackoverflow.com/a/22827128/3929494
function escapeShell (what) {
  return `${what.replace(/'/g, `'\\''`)}`;
}

module.exports = async function parseResponse (response, path) {
  const toRun = `echo '${escapeShell(response)}' | xmllint --xpath "${path}" -`
  return new Promise((resolve, reject) => {
    exec(toRun, (e, stdout, stderr) => {
      if (e) {
        reject(e)
        return
      }
      if (stderr) {
        reject(stderr)
        return
      }
      resolve(stdout.trimEnd())
    })
  })
}
