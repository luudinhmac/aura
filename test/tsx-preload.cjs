// The agent's Windows runtime can fail inside Node's os.userInfo().
// tsx only needs a stable numeric identity to construct its temporary path.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}
