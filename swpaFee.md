# feeRate struct

```sol
feeType: uint8, range (0~2)
feeRates: uint16[3], range: (0~1e6)
```

# policy

https://onchaintrade.gitbook.io/ot/fee-policy

# value setting

for stable coin: feeType = 2, feeRates = [60,30,30]
for non-stable coin: feeType = 1, feeRates = [300, 150, 300]
