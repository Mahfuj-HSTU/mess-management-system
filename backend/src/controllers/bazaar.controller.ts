import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { assertMonthlyManager, monthYearFromDate } from '../lib/permissions'

// POST /api/bazaar/:messId
export async function addBazaar(req: Request, res: Response) {
  const messId = req.params.messId
  const { name, amount, description, date } = req.body

  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required.' })
    return
  }
  if (!amount || !date) {
    res.status(400).json({ error: 'amount and date are required.' })
    return
  }
  if (Number(amount) <= 0) {
    res.status(400).json({ error: 'Amount must be a positive number.' })
    return
  }

  const { month, year } = monthYearFromDate(date)
  const allowed = await assertMonthlyManager(
    messId as string,
    req.userId,
    month,
    year,
    res
  )
  if (!allowed) return

  const bazaar = await prisma.bazaar.create({
    data: {
      messId: messId as string,
      name: name.trim(),
      amount: Number(amount),
      description: description?.trim() || null,
      date: new Date(date),
      addedById: req.userId
    },
    include: { addedBy: { select: { id: true, name: true } } }
  })

  // Deduct from manager cash
  await prisma.managerCash.upsert({
    where: { messId },
    update: { balance: { decrement: Number(amount) } },
    create: { messId, balance: -Number(amount) }
  })

  res.status(201).json({ bazaar })
}

// GET /api/bazaar/:messId?month=&year=
export async function getBazaars(req: Request, res: Response) {
  const messId = req.params.messId
  const month = Number(req.query.month) || new Date().getMonth() + 1
  const year = Number(req.query.year) || new Date().getFullYear()

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const bazaars = await prisma.bazaar.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' }
  })

  const totalCost = bazaars.reduce((sum, b) => sum + b.amount, 0)
  res.json({ bazaars, totalCost })
}

// DELETE /api/bazaar/:messId/:bazaarId
export async function deleteBazaar(req: Request, res: Response) {
  const { messId, bazaarId } = req.params

  const bazaar = await prisma.bazaar.findUnique({ where: { id: bazaarId } })
  if (!bazaar || bazaar.messId !== messId) {
    res.status(404).json({ error: 'Bazaar entry not found.' })
    return
  }

  const { month, year } = monthYearFromDate(bazaar.date.toISOString())
  const allowed = await assertMonthlyManager(
    messId,
    req.userId,
    month,
    year,
    res
  )
  if (!allowed) return

  await prisma.managerCash.update({
    where: { messId },
    data: { balance: { increment: bazaar.amount } }
  })

  await prisma.bazaar.delete({ where: { id: bazaarId } })
  res.json({ message: 'Bazaar entry deleted.' })
}
