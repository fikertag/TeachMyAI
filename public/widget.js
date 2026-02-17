(function () {
  var script = document.currentScript;
  if (!script) return;

  var serviceId = (script.dataset && script.dataset.service) || "";
  serviceId = String(serviceId || "").trim();
  if (!serviceId) return;

  var origin = script.src
    ? new URL(script.src, window.location.href).origin
    : window.location.origin;
  var iframeSrc =
    origin + "/embed/chat?service=" + encodeURIComponent(serviceId);

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.style.position = "fixed";
  button.style.right = "16px";
  button.style.bottom = "16px";
  button.style.zIndex = "2147483647";
  button.style.width = "56px";
  button.style.height = "56px";
  button.style.borderRadius = "9999px";
  button.style.border = "1px solid rgba(0,0,0,0.15)";
  button.style.background = "#111";
  button.style.color = "#fff";
  button.style.cursor = "pointer";
  button.style.font =
    "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  button.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  button.textContent = "Chat";

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.title = "Chat";
  iframe.style.position = "fixed";
  iframe.style.right = "16px";
  iframe.style.bottom = "80px";
  iframe.style.width = "360px";
  iframe.style.height = "520px";
  iframe.style.maxWidth = "calc(100vw - 32px)";
  iframe.style.maxHeight = "calc(100vh - 120px)";
  iframe.style.border = "1px solid rgba(0,0,0,0.15)";
  iframe.style.borderRadius = "12px";
  iframe.style.background = "#fff";
  iframe.style.boxShadow = "0 16px 48px rgba(0,0,0,0.2)";
  iframe.style.zIndex = "2147483647";
  iframe.style.display = "none";

  function toggle() {
    var open = iframe.style.display !== "none";
    iframe.style.display = open ? "none" : "block";
    button.textContent = open ? "Chat" : "Close";
  }

  button.addEventListener("click", toggle);

  document.body.appendChild(button);
  document.body.appendChild(iframe);
})();
