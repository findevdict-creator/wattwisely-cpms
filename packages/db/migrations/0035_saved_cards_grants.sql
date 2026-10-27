-- Module 19, part 2: what the API and the worker (wattwisely_app) may do with the saved cards of
-- driver accounts. A global table, like driver_accounts: nothing is deleted, a card the driver
-- removes keeps its row as 'removed' so old payments can still say which card paid.
GRANT SELECT, INSERT, UPDATE ON payment_methods TO wattwisely_app;
