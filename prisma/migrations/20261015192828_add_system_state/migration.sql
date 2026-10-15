-- CreateTable
CREATE TABLE "system_state" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_state_pkey" PRIMARY KEY ("key")
);
