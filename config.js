/* Local, untracked configuration.  Deployed to the web root like any other
 * app-shell file, but never committed: see config.example.js.
 *
 * The CARTO key is necessarily visible in the delivered page -- every basemap
 * request carries it -- so keeping it out of git buys permanence, not secrecy.
 * Restrict it by referring domain in the CARTO dashboard; that is the control
 * that actually matters.
 */
const CARTO_KEY = 'cb1_3q99_1_c446fafcbf3f6a563c9bdc5f';
