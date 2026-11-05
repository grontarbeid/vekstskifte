/* Oppsett for GoatCounter (besøkstelling uten informasjonskapsler).
   vekstskifte.no bruker samme teller som okologiskitall.no (https://okologiskitall.goatcounter.com).
   Sidene telles med domenet foran, for eksempel «vekstskifte.no/», så de skilles fra okologiskitall.no.
   Lastes før count.js fra GoatCounter. */
window.goatcounter = {
  path: function (sti) {
    return location.host.replace(/^www\./, "") + sti;
  }
};
