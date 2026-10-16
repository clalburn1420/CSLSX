// Swap a player's poster for the provider's iframe on click. Nothing loads from
// YouTube/Vimeo/Spotify/SoundCloud until the visitor asks for it.
(function () {
  var SRC = {
    youtube: function (id) { return "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0"; },
    vimeo: function (id) { return "https://player.vimeo.com/video/" + id + "?autoplay=1"; },
    spotify: function (id) { return "https://open.spotify.com/embed/" + id; },
    soundcloud: function (id) {
      return "https://w.soundcloud.com/player/?url=" + encodeURIComponent("https://api.soundcloud.com/tracks/" + id) + "&auto_play=true&visual=true";
    }
  };
  document.querySelectorAll(".player").forEach(function (fig) {
    var btn = fig.querySelector(".player__play");
    var make = SRC[fig.dataset.provider];
    if (!btn || !make) return;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var frame = fig.querySelector(".player__frame");
      var iframe = document.createElement("iframe");
      iframe.src = make(fig.dataset.id);
      iframe.title = fig.dataset.title || "Player";
      iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
      fig.classList.add("is-playing");
      btn.remove();
      iframe.focus();
    });
  });
})();
