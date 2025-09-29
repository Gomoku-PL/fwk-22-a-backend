import { Router } from "express";
const router = Router()


router.get("/health", (req, res) => {
    console.log("Health enpoint hit")
    res.json({ ok: true })
})

export default router 