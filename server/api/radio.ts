export default defineEventHandler( async (event) => {
  // const config = useRuntimeConfig()
  console.log("event", event.context, event.req)
  return {
    name: "Blues",
    url: "https://stream-39.zeno.fm/agtp9c146qzuv?zs=azWAiz9SQTCC2pjV4LgLUg"
  }
})