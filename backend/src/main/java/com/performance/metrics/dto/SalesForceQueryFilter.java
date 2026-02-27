package com.performance.metrics.dto;

import lombok.Data;

import java.util.List;

@Data
public class SalesForceQueryFilter {

    private List<String> case_record_type__c;
    private List<String> customer_segment__c;
    private List<String> type;
}
