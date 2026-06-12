import { Injectable } from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type AccountBalanceItem = {
  id: string;
  name: string;
  balance: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const endMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const accounts = await this.prisma.financialAccount.findMany({
      where: {
        deletedAt: null,
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const paidTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        deletedAt: null,
        status: TransactionStatus.PAID,
      },
    });

    const monthPaidTransactions = paidTransactions.filter(
      (transaction) =>
        transaction.transactionDate >= startMonth &&
        transaction.transactionDate <= endMonth,
    );

    let incomeMonth = 0;
    let expenseMonth = 0;

    for (const transaction of monthPaidTransactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === TransactionType.INCOME) {
        incomeMonth += amount;
      }

      if (transaction.type === TransactionType.EXPENSE) {
        expenseMonth += amount;
      }
    }

    const futureTransactions =
      await this.prisma.financialTransaction.findMany({
        where: {
          deletedAt: null,
          status: {
            not: TransactionStatus.PAID,
          },
          transactionDate: {
            gte: todayStart,
          },
        },
      });

    let futureIncomeMonth = 0;
    let futureExpenseMonth = 0;

    for (const transaction of futureTransactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === TransactionType.INCOME) {
        futureIncomeMonth += amount;
      }

      if (transaction.type === TransactionType.EXPENSE) {
        futureExpenseMonth += amount;
      }
    }

    const accountBalances: AccountBalanceItem[] = [];

    for (const account of accounts) {
      let balance = Number(account.initialBalance);

      const accountTransactions = paidTransactions.filter(
        (transaction) => transaction.accountId === account.id,
      );

      for (const transaction of accountTransactions) {
        const amount = Number(transaction.amount);

        if (transaction.type === TransactionType.INCOME) {
          balance += amount;
        }

        if (transaction.type === TransactionType.EXPENSE) {
          balance -= amount;
        }

        if (transaction.type === TransactionType.TRANSFER) {
          balance -= amount;
        }
      }

      const transferInTransactions = paidTransactions.filter(
        (transaction) => transaction.transferAccountId === account.id,
      );

      for (const transaction of transferInTransactions) {
        balance += Number(transaction.amount);
      }

      accountBalances.push({
        id: account.id,
        name: account.name,
        balance,
      });
    }

    const currentBalance = accountBalances.reduce(
      (sum, account) => sum + account.balance,
      0,
    );

    const futureBalancePreview =
      currentBalance + futureIncomeMonth - futureExpenseMonth;

    const lastTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        transactionDate: 'desc',
      },
      take: 10,
      include: {
        category: true,
        account: true,
        transferAccount: true,
      },
    });

    return {
      currentBalance,
      incomeMonth,
      expenseMonth,
      resultMonth: incomeMonth - expenseMonth,

      futureIncomeMonth,
      futureExpenseMonth,
      futureBalancePreview,

      accounts: accountBalances,
      lastTransactions,
    };
  }
}